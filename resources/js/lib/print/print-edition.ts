import {
    DEFAULT_PARTS,
    EDITION_SCHEMA_VERSION,
    PART_IDS,
    isThemeId,
    type Edition,
    type Elements,
    type Parts,
} from '@/lib/edition/types';
import { standardEdition } from '@/lib/game/standard-edition';
import type { CurrencyId, Locale } from '@/lib/game/types';
import { defaultCurrency } from '@/lib/render/strings';

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
    const parts = { ...DEFAULT_PARTS } as Parts;

    for (const id of PART_IDS) {
        parts[id] = print.parts?.[id] !== false;
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
    const parts = { ...edition.parts } as Parts;

    for (const id of PART_IDS) {
        parts[id] = true;
    }

    return { ...edition, parts };
}
