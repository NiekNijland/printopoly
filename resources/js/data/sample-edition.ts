import {
    DEFAULT_PARTS,
    EDITION_SCHEMA_VERSION,
    type Edition,
    type Elements,
} from '@/lib/edition/types';
import type { Locale } from '@/lib/game/types';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';

/**
 * The sample edition ("Zaterdagclub", "Saturday Club"): a few renamed streets and two cards, no photos.
 * The landing page draws it, and "Voorbeeld bekijken" opens the same data read-only (B97).
 */

interface SampleNames {
    edition: string;
    /** New names for streets, by board position. */
    streets: Record<number, string>;
    chance: string;
    chest: string;
}

const NAMES: Record<Locale, SampleNames> = {
    nl: {
        edition: 'Zaterdagclub',
        streets: {
            1: 'Jans Bierkelder',
            3: 'Het Clubhuis',
            6: 'Bij Oma Tine',
            9: 'De Vaste Kroeg',
            11: 'Pizza bij Sam',
            14: 'Het Voetbalveld',
        },
        chance: 'Je verliest de pot bij het kaarten. Betaal Jan 50.',
        chest: 'Je wint de pubquiz. Pak 100 van de bank.',
    },
    en: {
        edition: 'Saturday Club',
        streets: {
            1: "Jan's Beer Cellar",
            3: 'The Clubhouse',
            6: "Grandma Tina's",
            9: 'The Usual Pub',
            11: "Sam's Pizza",
            14: 'The Football Pitch',
        },
        chance: 'You lose the pot at cards. Pay Jan 50.',
        chest: 'You win the pub quiz. Take 100 from the bank.',
    },
};

/** A fixed time, so the server and the browser render the same thing. */
const SAMPLE_TIME = Date.UTC(2026, 10, 20);

export function sampleEdition(locale: Locale): Edition {
    const names = NAMES[locale];
    const elements: Elements = {
        'card.chance.01': { text: names.chance },
        'card.chest.01': { text: names.chest },
    };

    for (const [position, name] of Object.entries(names.streets)) {
        elements[`space.${position.padStart(2, '0')}`] = { name };
    }

    return {
        schemaVersion: EDITION_SCHEMA_VERSION,
        id: 'sample',
        name: names.edition,
        language: locale,
        currency: locale === 'nl' ? 'eur' : 'play',
        theme: 'classic',
        boardProfile: DEFAULT_BOARD_PROFILE,
        parts: { ...DEFAULT_PARTS },
        elements,
        revision: 1,
        createdAt: SAMPLE_TIME,
        updatedAt: SAMPLE_TIME,
    };
}
