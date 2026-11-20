import { defaultCurrency } from '@/lib/edition/changes';
import { HOUSE_RULES_KEY, spaceKey } from '@/lib/edition/keys';
import {
    DEFAULT_PARTS,
    EDITION_SCHEMA_VERSION,
    type Edition,
    type Elements,
    type Parts,
    type ThemeId,
} from '@/lib/edition/types';
import type { Locale } from '@/lib/game/types';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';

/**
 * Starting points for a new edition (B127): a name, a theme, the parts, own street names, a full set
 * of Chance and Community Chest cards and three house rules. The data lives in
 * `resources/data/templates/{locale}/{id}.json`, one file per template and language.
 */

export const TEMPLATE_IDS = [
    'village',
    'friends',
    'company',
    'bachelor',
    'wedding',
    'birthday',
    'family',
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

interface TemplateCard {
    /** May hold `{24}`: the name of that space, filled in when the edition is made. */
    text: string;
    /** Above 0 the player receives it, below 0 the player pays it. */
    amount?: number;
}

export interface TemplateData {
    id: TemplateId;
    language: Locale;
    label: string;
    tagline: string;
    /** The suggested name of the edition. */
    name: string;
    theme: ThemeId;
    parts: Omit<Parts, 'board'>;
    /** New names by board position: streets, stations and utilities. */
    spaces: Record<string, string>;
    chance: TemplateCard[];
    chest: TemplateCard[];
    houseRules: string[];
}

const files = import.meta.glob<TemplateData>('../../data/templates/*/*.json', {
    eager: true,
    import: 'default',
});

const BY_KEY = new Map<string, TemplateData>();
for (const [path, data] of Object.entries(files)) {
    const match = /templates\/(nl|en)\/([a-z]+)\.json$/.exec(path);
    if (match !== null) {
        BY_KEY.set(`${match[1]}/${match[2]}`, data);
    }
}

export function isTemplateId(value: unknown): value is TemplateId {
    return (
        typeof value === 'string' &&
        (TEMPLATE_IDS as readonly string[]).includes(value)
    );
}

export function template(
    id: TemplateId,
    locale: Locale,
): TemplateData | undefined {
    return BY_KEY.get(`${locale}/${id}`);
}

/** All templates in one language, in display order. */
export function templates(locale: Locale): TemplateData[] {
    return TEMPLATE_IDS.flatMap((id) => template(id, locale) ?? []);
}

/** Replaces `{24}` with the new name of that space. */
export function fillSpaceNames(
    text: string,
    spaces: Record<string, string>,
): string {
    return text.replace(/\{(\d+)\}/g, (whole, position: string) => {
        return spaces[position] ?? whole;
    });
}

/** The edition a template stands for, with a fixed time so server and browser agree. */
export function templateEdition(
    id: TemplateId,
    locale: Locale,
): Edition | undefined {
    const data = template(id, locale);
    if (data === undefined) {
        return undefined;
    }
    const elements: Elements = {};

    for (const [position, name] of Object.entries(data.spaces)) {
        elements[spaceKey(Number(position))] = { name };
    }
    (['chance', 'chest'] as const).forEach((deck) => {
        data[deck].forEach((card, index) => {
            elements[`card.${deck}.${String(index + 1).padStart(2, '0')}`] = {
                text: fillSpaceNames(card.text, data.spaces),
                ...(card.amount === undefined ? {} : { amount: card.amount }),
            };
        });
    });
    elements[HOUSE_RULES_KEY] = { text: data.houseRules.join('\n') };

    const time = Date.UTC(2026, 10, 20);

    return {
        schemaVersion: EDITION_SCHEMA_VERSION,
        id: `template-${id}`,
        name: data.name,
        language: locale,
        currency: defaultCurrency(locale),
        theme: data.theme,
        boardProfile: DEFAULT_BOARD_PROFILE,
        parts: { ...DEFAULT_PARTS, ...data.parts, board: true },
        elements,
        revision: 1,
        createdAt: time,
        updatedAt: time,
    };
}
