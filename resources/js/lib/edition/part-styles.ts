import PART_STYLE_IDS from './part-styles.json';
import type { ElementOverride, PartId } from './types';

/**
 * Styles per part (B268, Niek, feedback 22 nov): every part of the set follows the theme of the edition, unless it
 * has a style of its own. A style changes how a part is drawn (lines, letters, shapes), never its colours: those
 * stay the theme's, so a style works in every theme.
 *
 * HOW TO ADD A STYLE TO A PART (cards, deeds, money, pawns, box lid):
 * 1. Add its id to the part in `part-styles.json` (one line per part). The browser schema (`schema.ts`) and the
 *    server (`App\Edition\PartStyles`, used by `EditionValidator`) both read that file, so the id is valid on both
 *    sides at once.
 * 2. Add the id to the union of the part below (`CardStyle`, `DeedStyle`, …). `part-styles.test.ts` checks that the
 *    unions and the JSON say the same.
 * 3. Draw it: the renderer of the part reads `useRender().style?.parts?.<part>` (see `partStyleOf` in
 *    `lib/render/style.ts`). Absent means the theme, as before.
 * 4. Give it a name in `lang/nl.json` and `lang/en.json` under `part_style.<part>.<id>` and a preview in
 *    `PART_STYLE_PREVIEWS` (`components/editor/part-style-field.tsx`). The editor shows the choice for every part
 *    that has at least one style, in Editie > Uiterlijk and in the Stijl section of that part's elements.
 *
 * Storage: one element per part, `style.<part>` with the field `style` (`style.board`, `style.box_lid`, …). As an
 * element it goes along with undo, account sync, duplicating, the conflict check and the print job like every other
 * change, and the edition JSON keeps its shape.
 */

/** The parts that can have a style of their own; the house rules, booklet and invitation follow the others. */
export const STYLED_PARTS = [
    'board',
    'cards',
    'deeds',
    'money',
    'pawns',
    'boxLid',
] as const satisfies readonly PartId[];
export type StyledPart = (typeof STYLED_PARTS)[number];

/** The spaces and corners of the board: Vintage (engraved, banknote finish), Modern (flat blocks) or Speels. */
export type BoardStyle = 'vintage' | 'modern' | 'playful';
/** Chance and Community Chest cards: no styles yet. */
export type CardStyle = never;
/** Title deeds: no styles yet. */
export type DeedStyle = never;
/** Banknotes: no styles yet. */
export type MoneyStyle = never;
/** Pawns: Vintage (cream, double rule, an oval medallion), Modern (a colour block, big capitals) or Speels. */
export type PawnStyle = 'vintage' | 'modern' | 'playful';
/** The frame and decoration of the box lid, around the name plate of B265: the same three styles. */
export type BoxLidStyle = 'vintage' | 'modern' | 'playful';

export interface PartStyleIds {
    board: BoardStyle;
    cards: CardStyle;
    deeds: DeedStyle;
    money: MoneyStyle;
    pawns: PawnStyle;
    boxLid: BoxLidStyle;
}

/** The style of each part; a part that is absent follows the theme. */
export type PartStyles = { [P in StyledPart]?: PartStyleIds[P] };

/** The styles a part offers, in the order the editor shows them. */
export function partStyleIds<P extends StyledPart>(
    part: P,
): readonly PartStyleIds[P][] {
    return (PART_STYLE_IDS as Record<StyledPart, readonly string[]>)[
        part
    ] as readonly PartStyleIds[P][];
}

export function isPartStyle<P extends StyledPart>(
    part: P,
    value: unknown,
): value is PartStyleIds[P] {
    return (
        typeof value === 'string' &&
        (partStyleIds(part) as readonly string[]).includes(value)
    );
}

/** The parts with at least one style: the editor offers a choice for these only. */
export function partsWithStyles(): StyledPart[] {
    return STYLED_PARTS.filter((part) => partStyleIds(part).length > 0);
}

const KEY_NAME: Record<StyledPart, string> = {
    board: 'board',
    cards: 'cards',
    deeds: 'deeds',
    money: 'money',
    pawns: 'pawns',
    boxLid: 'box_lid',
};

/** The element that holds the style of a part: `style.board`, `style.box_lid`. */
export function partStyleKey(part: StyledPart): string {
    return `style.${KEY_NAME[part]}`;
}

/** The part of a style key, or `null` when the key is no style key. */
export function partOfStyleKey(key: string): StyledPart | null {
    const [head, name, ...rest] = key.split('.');
    if (head !== 'style' || rest.length > 0) {
        return null;
    }

    return STYLED_PARTS.find((part) => KEY_NAME[part] === name) ?? null;
}

/** The style of every part as stored in the elements of an edition; unknown ids are left out. */
export function partStylesOf(
    elements: Readonly<Record<string, ElementOverride | undefined>>,
): PartStyles {
    const styles: Record<string, string> = {};

    for (const part of STYLED_PARTS) {
        const value = elements[partStyleKey(part)]?.style;
        if (isPartStyle(part, value)) {
            styles[part] = value;
        }
    }

    return styles;
}
