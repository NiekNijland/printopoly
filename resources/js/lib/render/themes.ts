import type { DeckId } from '@/lib/game/types';

export type ThemeId = 'classic' | 'riso' | 'strak';

export const THEME_IDS: readonly ThemeId[] = ['classic', 'riso', 'strak'];

/** How an element uses its photo. */
export type Layout = 'framed' | 'text';

export interface Theme {
    id: ThemeId;
    /** Name shown in the interface per language. */
    name: { nl: string; en: string };
    /** Paper colour of cards, deeds and the lid. */
    paper: string;
    boardBackground: string;
    cornerBackground: string;
    ink: string;
    /** Thin lines between spaces and around frames. */
    line: string;
    /** Accent for frames, the Start arrow and rules (cyan, magenta or yellow in Riso). */
    accent: string;
    secondaryAccent: string;
    /** Card face colour per deck (B89: Chance light cyan, Community Chest light magenta). */
    deck: Record<DeckId, string>;
    /** Colour of the small bar on a card and of the deck symbol. */
    deckAccent: Record<DeckId, string>;
    headingFont: string;
    headingWeight: number;
    bodyFont: string;
    monoFont: string;
    /** Frame line width in mm. */
    frameMm: number;
    /** Paper colour of title deeds. */
    deedPaper: string;
    /** Colour and width (mm) of the frame around a title deed: thin and in the accent, unless the theme wants ink. */
    deedFrame: string;
    deedFrameMm: number;
    /** Colour per street group (`brown`, `lightblue`, ...) in the inks of the theme; the standard colours without. */
    groupColors?: Record<string, string>;
    /** Corner radius of playing cards in mm; 0 with bleed (B88). */
    cardRadiusMm: number;
    /** Heading letter case; Strak is lower-key than the other two. */
    headingTransform: 'none' | 'uppercase';
}

const SPARTAN = "'League Spartan', 'Instrument Sans', sans-serif";
const INSTRUMENT = "'Instrument Sans', sans-serif";
const PLEX_MONO = "'IBM Plex Mono', monospace";

/** All colours stay within the CMYK gamut (B75): flat tints of the print colours, no neon. */
export const THEMES: Record<ThemeId, Theme> = {
    classic: {
        id: 'classic',
        name: { nl: 'Klassiek', en: 'Classic' },
        paper: '#FFFDF7',
        boardBackground: '#D4E9D7',
        cornerBackground: '#C5DFC9',
        ink: '#1B1F24',
        line: 'rgba(27, 31, 36, 0.5)',
        accent: '#1B1F24',
        secondaryAccent: '#C8321F',
        deck: { chance: '#CCEDF9', chest: '#FACCE5' },
        deckAccent: { chance: '#00A3E0', chest: '#E6007E' },
        headingFont: SPARTAN,
        headingWeight: 800,
        bodyFont: INSTRUMENT,
        monoFont: PLEX_MONO,
        frameMm: 0.5,
        deedPaper: '#FFFDF7',
        deedFrame: '#1B1F24',
        deedFrameMm: 0.5,
        cardRadiusMm: 3,
        headingTransform: 'none',
    },
    riso: {
        id: 'riso',
        name: { nl: 'Riso', en: 'Riso' },
        paper: '#FFFDF7',
        boardBackground: '#FFF2F7',
        cornerBackground: '#FACCE5',
        ink: '#1B1F24',
        line: 'rgba(27, 31, 36, 0.5)',
        accent: '#E6007E',
        secondaryAccent: '#00A3E0',
        deck: { chance: '#CCEDF9', chest: '#FACCE5' },
        deckAccent: { chance: '#00A3E0', chest: '#E6007E' },
        headingFont: SPARTAN,
        headingWeight: 800,
        bodyFont: INSTRUMENT,
        monoFont: PLEX_MONO,
        frameMm: 0.6,
        // Riso: the deed is part of the pink and blue set, not a cream card in a black frame.
        deedPaper: '#FFF2F7',
        deedFrame: '#E6007E',
        deedFrameMm: 0.35,
        groupColors: {
            brown: '#9A4E8E',
            lightblue: '#7FD0F0',
            pink: '#F27FBF',
            orange: '#FF8A3D',
            red: '#E8304F',
            yellow: '#FFE14D',
            green: '#3FBF8F',
            darkblue: '#1F6FB2',
        },
        cardRadiusMm: 3,
        headingTransform: 'none',
    },
    strak: {
        id: 'strak',
        name: { nl: 'Strak', en: 'Plain' },
        paper: '#FFFFFF',
        boardBackground: '#FFFFFF',
        cornerBackground: '#F1F1EE',
        ink: '#1B1F24',
        line: 'rgba(27, 31, 36, 0.5)',
        accent: '#1B1F24',
        secondaryAccent: '#4A4F57',
        deck: { chance: '#F1F1EE', chest: '#F1F1EE' },
        deckAccent: { chance: '#00A3E0', chest: '#E6007E' },
        headingFont: INSTRUMENT,
        headingWeight: 600,
        bodyFont: INSTRUMENT,
        monoFont: PLEX_MONO,
        frameMm: 0.35,
        deedPaper: '#FFFFFF',
        deedFrame: '#1B1F24',
        deedFrameMm: 0.25,
        cardRadiusMm: 3,
        headingTransform: 'none',
    },
};
