import { defaultCurrency, isDefaultCurrency } from '@/lib/render/game-currency';
import type { BoardProfile } from '@/lib/render/print-board';
import type { Locale } from '@/types/game';
import { parseKey } from './edition-keys';
import { messages } from './edition-strings';
import {
    type Edition,
    type ElementChange,
    type ThemeId,
} from './edition-types';

/** Result of a settings change: the new edition, element changes for the undo stack, and the sentence for the dialog. */
export type SettingsChange = {
    edition: Edition;
    /** Element-level changes that came with it (only theme changes make any). */
    changes: ElementChange[];
    /** The sentence shown under the setting (Staten design), in the interface language. */
    summary: string;
};

const countPhotos = (edition: Edition): number => {
    return Object.values(edition.elements).filter(
        (override) => override.photo !== undefined,
    ).length;
};

/**
 * Switching language keeps custom names and texts; only the default texts change, because the standard data is
 * resolved per language. The currency follows only if it is still the default of the old language.
 */
export const changeLanguage = (
    edition: Edition,
    language: Locale,
    interfaceLanguage: Locale = edition.language,
): SettingsChange => {
    const currency = isDefaultCurrency(edition.language, edition.currency)
        ? defaultCurrency(language)
        : edition.currency;
    const customNames = Object.entries(edition.elements).filter(
        ([key, override]) =>
            override.name !== undefined && parseKey(key)?.kind === 'space',
    ).length;
    const m = messages[interfaceLanguage];

    return {
        edition: { ...edition, language, currency },
        changes: [],
        summary: m.settings.language(m.languageName[language], customNames),
    };
};

/** Switching theme only changes the look; elements keep what they have. */
export const changeTheme = (
    edition: Edition,
    theme: ThemeId,
    interfaceLanguage: Locale = edition.language,
): SettingsChange => {
    const m = messages[interfaceLanguage];

    return {
        edition: { ...edition, theme },
        changes: [],
        summary: m.settings.theme(m.themeName[theme]),
    };
};

/**
 * A different board profile keeps all photo transforms: they are normalised and not tied to millimetres (B61).
 * Callers validate the profile first (`parseBoardProfile`).
 */
export const changeBoardProfile = (
    edition: Edition,
    boardProfile: BoardProfile,
    interfaceLanguage: Locale = edition.language,
): SettingsChange => {
    return {
        edition: { ...edition, boardProfile },
        changes: [],
        summary: messages[interfaceLanguage].settings.boardProfile(
            countPhotos(edition),
        ),
    };
};

export const rename = (edition: Edition, name: string): Edition => {
    return { ...edition, name: name.trim() };
};
