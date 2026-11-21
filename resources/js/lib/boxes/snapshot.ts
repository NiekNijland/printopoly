import { isExtraCardKey, parseKey } from '@/lib/edition/keys';
import { EDITION_SCHEMA_VERSION, type Edition } from '@/lib/edition/types';
import { defaultCurrency } from '@/lib/game/currency';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';

import type { BoxSnapshot } from './types';

/**
 * The part of an edition a box keeps (B128): the names of spaces and pawns and the texts of cards that differ from
 * the standard edition, plus theme, currency and whether cards and pawns are in the set. The extra cards (B135) come
 * along with `added`, so friends can add to them too. No photos, no layers.
 * The server cleans it again, so this is only what the owner's browser offers.
 */
export function buildSnapshot(edition: Edition): BoxSnapshot {
    const elements: BoxSnapshot['elements'] = {};

    for (const [key, override] of Object.entries(edition.elements)) {
        const kind = parseKey(key)?.kind;

        if (kind === 'space' || kind === 'pawn') {
            if (override.name !== undefined && override.name.trim() !== '') {
                elements[key] = { name: override.name };
            }
        } else if (kind === 'group') {
            if (override.town !== undefined && override.town.trim() !== '') {
                elements[key] = { town: override.town };
            }
        } else if (kind === 'card') {
            const extra = isExtraCardKey(key);

            if (extra && override.added !== true) {
                continue;
            }

            const text =
                override.text !== undefined && override.text.trim() !== ''
                    ? { text: override.text }
                    : {};

            if (extra) {
                elements[key] = { added: true, ...text };
            } else if ('text' in text) {
                elements[key] = text;
            }
        }
    }

    return {
        theme: edition.theme,
        currency: edition.currency,
        parts: { cards: edition.parts.cards, pawns: edition.parts.pawns },
        elements,
    };
}

/** What the picture for the group app needs (B77): names only, as the server expects them. */
export function shareImageEdition(edition: Edition): unknown {
    const elements: Record<string, { name: string }> = {};

    for (const [key, override] of Object.entries(edition.elements)) {
        const kind = parseKey(key)?.kind;

        if (
            (kind === 'space' || kind === 'boardCenter') &&
            override.name !== undefined &&
            override.name.trim() !== ''
        ) {
            elements[key] = { name: override.name };
        }
    }

    return {
        name: edition.name,
        language: edition.language,
        theme: edition.theme,
        currency: edition.currency,
        boardProfile: edition.boardProfile,
        elements,
    };
}

/** An edition for the friends' page and the preview: the standard edition with the owner's names on it. */
export function editionFromSnapshot(
    snapshot: BoxSnapshot,
    meta: { name: string; language: Edition['language'] },
): Edition {
    const theme =
        snapshot.theme === 'riso' || snapshot.theme === 'strak'
            ? snapshot.theme
            : 'classic';

    return {
        schemaVersion: EDITION_SCHEMA_VERSION,
        id: 'box-snapshot',
        name: meta.name,
        language: meta.language,
        currency: (snapshot.currency ??
            defaultCurrency(meta.language)) as Edition['currency'],
        theme,
        boardProfile: DEFAULT_BOARD_PROFILE,
        parts: {
            board: true,
            deeds: false,
            cards: snapshot.parts.cards,
            money: false,
            pawns: snapshot.parts.pawns,
            boxLid: false,
            houseRules: false,
            rulesBooklet: false,
            foldModels: false,
            dice: false,
            invitation: false,
        },
        elements: { ...snapshot.elements },
        revision: 1,
        createdAt: 0,
        updatedAt: 0,
    };
}
