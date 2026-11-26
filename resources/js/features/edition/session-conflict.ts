import type { Edition } from '@/lib/render/edition-types';
import type { Locale } from '@/types/game';

import { summarizeDifference } from './summary';

/** One version of an edition in a conflict: when it was last changed and what changed. */
type ConflictSide = {
    /** Milliseconds since the epoch; show as "14:32". */
    at: number;
    /** "Stadspark aangepast", "2 kaarten aangepast". */
    summary: string;
};

/** Two windows changed the same edition. The UI asks which version to keep (B81, Staten design). */
export type EditionConflict = {
    editionId: string;
    editionName: string;
    /** This window ("Dit venster"). */
    mine: ConflictSide;
    /** The other window ("Ander venster"). */
    theirs: ConflictSide;
    /** The stored version from the other window. */
    theirsEdition: Edition;
};

export const buildConflict = (
    saved: Edition,
    mine: { edition: Edition; at: number },
    theirs: Edition,
    language: Locale,
): EditionConflict => ({
    editionId: mine.edition.id,
    editionName: mine.edition.name,
    mine: {
        at: mine.at,
        summary: summarizeDifference(saved, mine.edition, language),
    },
    theirs: {
        at: theirs.updatedAt,
        summary: summarizeDifference(saved, theirs, language),
    },
    theirsEdition: theirs,
});
