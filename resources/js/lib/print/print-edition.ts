import {
    DEFAULT_PARTS,
    EXTRA_PART_IDS,
    EDITION_SCHEMA_VERSION,
    PART_IDS,
    isThemeId,
    type Edition,
    type Elements,
} from '@/lib/edition/types';
import { deedsFor, standardEdition } from '@/lib/game/standard-edition';
import type { CurrencyId, Locale } from '@/lib/game/types';
import { defaultCurrency } from '@/lib/render/strings';
import type { PrintPart } from '@/types/generated';

import { DEFAULT_BOARD_PROFILE } from './board';
import type { PrintEdition } from './composition';

/**
 * The edition the print server sends is the stored one with `src` and `target` added to photos. This turns
 * it into the `Edition` the renderers and `resolveEdition` read. Parts that are not mentioned count as on,
 * the way the server counts them (`PrintEditionData::enabledParts`); the board is always on.
 */
export function toEdition(print: PrintEdition): Edition {
    const language: Locale = print.language === 'en' ? 'en' : 'nl';
    const currency: CurrencyId =
        standardEdition.currencies.find((entry) => entry.id === print.currency)
            ?.id ?? defaultCurrency(language);
    const parts = { ...DEFAULT_PARTS };

    for (const id of PART_IDS) {
        // The extra print items came later and are off unless the edition says so (B123).
        parts[id] = EXTRA_PART_IDS.includes(id)
            ? print.parts?.[id] === true
            : print.parts?.[id] !== false;
    }

    return {
        schemaVersion: EDITION_SCHEMA_VERSION,
        id: 'print',
        name: print.name ?? '',
        language,
        currency,
        theme: isThemeId(print.theme) ? print.theme : 'classic',
        boardProfile: print.boardProfile ?? DEFAULT_BOARD_PROFILE,
        parts,
        elements: print.elements as unknown as Elements,
        revision: 1,
        createdAt: 0,
        updatedAt: 0,
    };
}

/** All parts on: which parts print is decided by the print job, not by the renderer. */
export function allPartsOn(edition: Edition): Edition {
    const parts = { ...edition.parts };

    for (const id of PART_IDS) {
        parts[id] = true;
    }

    return { ...edition, parts };
}

/**
 * The production parts an edition prints, as the server counts them (`PrintEditionData::enabledParts`):
 * the board always, and deeds and cards both end up in the "cards" part. The house rules card prints with
 * the cards too.
 */
export function enabledPrintParts(edition: Edition): PrintPart[] {
    const on = (...ids: (keyof Edition['parts'])[]) =>
        ids.some((id) => edition.parts[id]);

    return (
        [
            ['board', true],
            ['cards', on('deeds', 'cards', 'houseRules')],
            ['money', on('money')],
            ['tokens', on('pawns')],
            ['box_lid', on('boxLid')],
            ['rules_booklet', on('rulesBooklet')],
            ['fold_models', on('foldModels')],
            ['dice', on('dice')],
            ['invitation', on('invitation')],
        ] as const
    )
        .filter(([, enabled]) => enabled)
        .map(([part]) => part);
}

/** The number of cards the "cards" part prints (`PrintEditionData::cardCount`). */
export function cardCountOf(edition: Edition): number {
    const deeds = edition.parts.deeds ? deedsFor().length : 0;
    const decks = edition.parts.cards
        ? standardEdition.decks.chance.length +
          standardEdition.decks.chest.length
        : 0;

    return deeds + decks + (edition.parts.houseRules ? 1 : 0);
}
