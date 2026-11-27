import { is, oneOf } from '@/lib/parse';
/** Built-in patterns for card backs and the board background, drawn as flat vector shapes (B83). */
export type PatternId =
    | 'dots'
    | 'stripes'
    | 'checks'
    | 'waves'
    | 'diamonds'
    | 'grid'
    | 'rings'
    | 'confetti';

export const PATTERN_IDS: readonly PatternId[] = [
    'dots',
    'stripes',
    'checks',
    'waves',
    'diamonds',
    'grid',
    'rings',
    'confetti',
];

export const PATTERN_NAMES: Readonly<
    Record<PatternId, { nl: string; en: string }>
> = {
    dots: { nl: 'Stippen', en: 'Dots' },
    stripes: { nl: 'Strepen', en: 'Stripes' },
    checks: { nl: 'Ruitjes', en: 'Checks' },
    waves: { nl: 'Golven', en: 'Waves' },
    diamonds: { nl: 'Ruiten', en: 'Diamonds' },
    grid: { nl: 'Raster', en: 'Grid' },
    rings: { nl: 'Ringen', en: 'Rings' },
    confetti: { nl: 'Confetti', en: 'Confetti' },
};

const patternId = oneOf(PATTERN_IDS);

export const isPatternId = (value: unknown) => is(patternId, value);

/** Edge of one tile in mm. */
export const PATTERN_TILE_MM = 6;
