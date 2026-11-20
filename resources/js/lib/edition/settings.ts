import type { CurrencyId, Locale } from '@/lib/game/types';
import type { BoardProfile } from '@/lib/print/board';
import { applyChanges } from './changes';
import { THEME_LAYOUTS, parseKey } from './keys';
import { messages } from './strings';
import { FALLBACK_LAYOUT, PART_IDS, type Edition, type ElementChange, type PartId, type ThemeId } from './types';

/** Result of a settings change: the new edition, element changes for the undo stack, and the sentence for the dialog. */
export interface SettingsChange {
    edition: Edition;
    /** Element-level changes that came with it (only theme changes make any). */
    changes: ElementChange[];
    /** The sentence shown under the setting (Staten design), in the interface language. */
    summary: string;
}

/** Count of elements with an override per part. */
export function customizedPerPart(edition: Edition): Record<PartId, number> {
    const counts = Object.fromEntries(PART_IDS.map((id) => [id, 0])) as Record<PartId, number>;
    for (const key of Object.keys(edition.elements)) {
        const part = parseKey(key)?.part;
        if (part !== undefined) {
            counts[part] += 1;
        }
    }

    return counts;
}

function countPhotos(edition: Edition): number {
    return Object.values(edition.elements).filter((override) => override.photo !== undefined).length;
}

/**
 * Switching language keeps custom names and texts; only the default texts change, because the standard data is
 * resolved per language. The currency follows only if it is still the default of the old language.
 */
export function changeLanguage(
    edition: Edition,
    language: Locale,
    interfaceLanguage: Locale = edition.language,
): SettingsChange {
    const defaultOf = (l: Locale): CurrencyId => (l === 'nl' ? 'eur' : 'play');
    const currency = edition.currency === defaultOf(edition.language) ? defaultOf(language) : edition.currency;
    const customNames = Object.entries(edition.elements).filter(
        ([key, override]) => override.name !== undefined && parseKey(key)?.kind === 'space',
    ).length;
    const m = messages[interfaceLanguage];

    return {
        edition: { ...edition, language, currency },
        changes: [],
        summary: m.settings.language(m.languageName[language], customNames),
    };
}

/** Switching currency has no side effects. */
export function changeCurrency(edition: Edition, currency: CurrencyId): Edition {
    return { ...edition, currency };
}

/** Switching theme turns layouts the new theme does not have into "Foto in kader". */
export function changeTheme(
    edition: Edition,
    theme: ThemeId,
    interfaceLanguage: Locale = edition.language,
): SettingsChange {
    const supported = THEME_LAYOUTS[theme];
    const changes: ElementChange[] = [];

    for (const [key, override] of Object.entries(edition.elements)) {
        if (override.layout !== undefined && !supported.includes(override.layout)) {
            changes.push({ key, before: override, after: { ...override, layout: FALLBACK_LAYOUT } });
        }
    }
    const m = messages[interfaceLanguage];

    return {
        edition: { ...applyChanges(edition, changes), theme },
        changes,
        summary: m.settings.theme(m.themeName[theme], m.layoutFrame, changes.length),
    };
}

/** Switching a part off keeps its overrides; they come back when it is switched on (B99). The board cannot be switched off. */
export function setPart(
    edition: Edition,
    part: PartId,
    on: boolean,
    interfaceLanguage: Locale = edition.language,
): SettingsChange {
    if (part === 'board' && !on) {
        throw new RangeError('The board is always on');
    }
    const customized = customizedPerPart(edition)[part];
    const m = messages[interfaceLanguage].settings;

    return {
        edition: { ...edition, parts: { ...edition.parts, [part]: on } },
        changes: [],
        summary: on ? m.partOn(part, customized) : m.partOff(part, customized),
    };
}

/**
 * A different board profile keeps all photo transforms: they are normalised and not tied to millimetres (B61).
 * Callers validate the profile first (`parseBoardProfile`).
 */
export function changeBoardProfile(
    edition: Edition,
    boardProfile: BoardProfile,
    interfaceLanguage: Locale = edition.language,
): SettingsChange {
    return {
        edition: { ...edition, boardProfile },
        changes: [],
        summary: messages[interfaceLanguage].settings.boardProfile(countPhotos(edition)),
    };
}

export function rename(edition: Edition, name: string): Edition {
    return { ...edition, name: name.trim() };
}
