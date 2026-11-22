import type { DeckId } from '@/lib/game/types';

export type ThemeId = 'classic' | 'riso' | 'strak' | 'gala';

export const THEME_IDS: readonly ThemeId[] = [
    'classic',
    'riso',
    'strak',
    'gala',
];

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
    /** The big name of the edition: the plate in the centre and the box lid. */
    titleFont: string;
    titleWeight: number;
    /** How much larger the big name may grow than in League Spartan: a script has small letters for its size. */
    titleScale: number;
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
    /**
     * A second thin line inside the frame of a card, deed, lid or booklet page (Gala, B247): `gapMm` inside the
     * frame, in its own colour. Themes without it draw a single frame.
     */
    ornament?: { color: string; strokeMm: number; gapMm: number };
}

const SPARTAN = "'League Spartan', 'Instrument Sans', sans-serif";
const INSTRUMENT = "'Instrument Sans', sans-serif";
const PLEX_MONO = "'IBM Plex Mono', monospace";
const PLAYFAIR = "'Playfair Display', Georgia, serif";
const GREAT_VIBES = "'Great Vibes', 'Playfair Display', cursive";

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
        titleFont: SPARTAN,
        titleWeight: 800,
        titleScale: 1,
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
        titleFont: SPARTAN,
        titleWeight: 800,
        titleScale: 1,
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
        name: { nl: 'Strak', en: 'Sleek' },
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
        titleFont: INSTRUMENT,
        titleWeight: 600,
        titleScale: 1,
        bodyFont: INSTRUMENT,
        monoFont: PLEX_MONO,
        frameMm: 0.35,
        deedPaper: '#FFFFFF',
        deedFrame: '#1B1F24',
        deedFrameMm: 0.25,
        cardRadiusMm: 3,
        headingTransform: 'none',
    },
    /**
     * Gala (B247): ivory paper, champagne corners and a deep gold, with blush and sage for the two decks. A serif
     * for headings, a script only for the big name, and a thin gold line inside every frame. The text stays in a
     * warm near-black, so it reads like Klassiek on a home printer.
     */
    gala: {
        id: 'gala',
        name: { nl: 'Gala', en: 'Gala' },
        paper: '#FFFCF5',
        boardBackground: '#F7F0E3',
        cornerBackground: '#EFE3CC',
        ink: '#2B2621',
        line: 'rgba(43, 38, 33, 0.45)',
        accent: '#8C6A22',
        secondaryAccent: '#9C5B67',
        deck: { chance: '#F5E1E0', chest: '#E4EADB' },
        deckAccent: { chance: '#B0636F', chest: '#5E7D57' },
        headingFont: PLAYFAIR,
        headingWeight: 700,
        titleFont: GREAT_VIBES,
        titleWeight: 400,
        titleScale: 1.5,
        bodyFont: INSTRUMENT,
        monoFont: INSTRUMENT,
        frameMm: 0.35,
        deedPaper: '#FFFCF5',
        deedFrame: '#8C6A22',
        deedFrameMm: 0.35,
        groupColors: {
            brown: '#8A5A44',
            lightblue: '#A9C6DA',
            pink: '#D9A0AE',
            orange: '#E0A86A',
            red: '#B5474E',
            yellow: '#E6C65C',
            green: '#7E9C76',
            darkblue: '#2F4A6B',
        },
        cardRadiusMm: 3,
        headingTransform: 'none',
        ornament: { color: '#B8923F', strokeMm: 0.2, gapMm: 1.1 },
    },
};
