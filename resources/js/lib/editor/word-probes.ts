import { cardKey, deedKey, spaceKey, type WordId } from '@/lib/edition/keys';
import type { PartId } from '@/lib/edition/types';
import { deedsFor, standardEdition } from '@/lib/game/standard-edition';
import type { Localized } from '@/lib/game/types';

/** An element that shows a custom word, drawn out of sight so Controle can tell when the word does not fit. */
export interface WordProbe {
    key: string;
    /** The part that has to be on for the element to be printed. */
    part: PartId;
    /** Where the word is printed, in a sentence: "de eigendomsbewijzen". */
    place: Localized;
}

const CARDS: Localized = { nl: 'de kaarten', en: 'the cards' };
const BOARD: Localized = { nl: 'het bord', en: 'the board' };

const DEED: WordProbe = {
    key: deedKey(1),
    part: 'deeds',
    place: { nl: 'de eigendomsbewijzen', en: 'the title deeds' },
};

const NOTE: WordProbe = {
    key: 'note.500',
    part: 'money',
    place: { nl: 'het speelgeld', en: 'the play money' },
};

/** The deed of the first station or utility, where the word stands in the rent lines. */
function deedOf(type: 'station' | 'utility'): WordProbe {
    return {
        ...DEED,
        key: deedKey(deedsFor().findIndex((space) => space.type === type) + 1),
    };
}

function cardsWith(placeholder: string): WordProbe[] {
    const found: WordProbe[] = [];

    for (const deck of ['chance', 'chest'] as const) {
        standardEdition.decks[deck].forEach((card, index) => {
            if (card.text.nl.includes(placeholder)) {
                found.push({
                    key: cardKey(deck, index + 1),
                    part: 'cards',
                    place: CARDS,
                });
            }
        });
    }

    return found;
}

const onBoard = (position: number): WordProbe => ({
    key: spaceKey(position),
    part: 'board',
    place: BOARD,
});

const onCard = (key: string): WordProbe => ({
    key,
    part: 'cards',
    place: CARDS,
});

/**
 * Per word, the elements to draw to see whether it fits: the deeds for houses and hotels, the cards that
 * carry the word, the spaces and card faces for the decks, and the prices for the currency.
 */
export const WORD_PROBES: Readonly<Record<WordId, readonly WordProbe[]>> = {
    house: [DEED, ...cardsWith('{house}')],
    hotel: [DEED, ...cardsWith('{hotel}')],
    jail: cardsWith('{jail}'),
    currency: [onBoard(1), onBoard(4), DEED, NOTE],
    chance: [
        onBoard(7),
        onCard(cardKey('chance', 1)),
        onCard('card_back.chance'),
    ],
    chest: [onBoard(2), onCard(cardKey('chest', 1)), onCard('card_back.chest')],
    bank: [NOTE],
    station: [deedOf('station'), ...cardsWith('{station}')],
    utility: [deedOf('utility'), ...cardsWith('{utility}')],
};
