import { extraCardKeys } from '@/lib/render/edition-keys';
import {
    DEFAULT_PARTS,
    EXTRA_PART_IDS,
    EDITION_SCHEMA_VERSION,
    PART_IDS,
    isThemeId,
    type Edition,
    type Elements,
} from '@/lib/render/edition-types';
import { deedsFor, standardEdition } from '@/lib/render/standard-edition';
import { defaultCurrency } from '@/lib/render/strings';
import type { CurrencyId, Locale } from '@/types/game';

import { DEFAULT_BOARD_PROFILE } from './print-board';
import { hasHouseRulesCard, type PrintEdition } from './print-composition';
import { isMoneyAmount } from './print-money';

/**
 * The edition the print server sends is the stored one with `src` and `target` added to photos. This turns
 * it into the `Edition` the renderers and `resolveEdition` read. Parts that are not mentioned count as on,
 * the way the server counts them (`PrintEditionData::enabledParts`); the board is always on.
 */
export const toEdition = (print: PrintEdition): Edition => {
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
        ...(isMoneyAmount(print.moneyAmount)
            ? { moneyAmount: print.moneyAmount }
            : {}),
        elements: print.elements as unknown as Elements,
        revision: 1,
        createdAt: 0,
        updatedAt: 0,
    };
};

/** All parts on: which parts print is decided by the print job, not by the renderer. */
export const allPartsOn = (edition: Edition): Edition => {
    const parts = { ...edition.parts };

    for (const id of PART_IDS) {
        parts[id] = true;
    }

    return { ...edition, parts };
};

/** The number of cards the "cards" part prints (`PrintEditionData::cardCount`). */
export const cardCountOf = (edition: Edition): number => {
    // The cards part always holds the deeds and both decks; whether it is in the set is chosen on the print page (B198).
    const deeds = deedsFor().length;
    const decks =
        standardEdition.decks.chance.length +
        standardEdition.decks.chest.length +
        extraCardKeys(edition.elements, 'chance').length +
        extraCardKeys(edition.elements, 'chest').length;

    return deeds + decks + (hasHouseRulesCard(edition) ? 1 : 0);
};
