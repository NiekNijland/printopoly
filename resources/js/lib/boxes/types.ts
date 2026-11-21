import type { Locale } from '@/lib/game/types';

/** What "Samen maken" (B128) keeps of an edition: names and texts, no photos. */
export interface BoxSnapshot {
    theme: string;
    currency: string | null;
    parts: { cards: boolean; pawns: boolean };
    /** `added` marks an extra card (B135): friends can add to it like to a standard card. */
    elements: Record<
        string,
        { name?: string; text?: string; town?: string; added?: true }
    >;
}

type BoxStatus = 'open' | 'closed';

export interface BoxContributionData {
    id: string;
    elementKey: string;
    firstName: string;
    /** `text` for a card, `town` for a colour group, `name` for a space or a pawn. */
    field: 'name' | 'text' | 'town';
    value: string | null;
    hasPhoto: boolean;
    width: number | null;
    height: number | null;
    /** Route of the photo; only the owner can read it. */
    photoUrl: string | null;
    createdAt: number | null;
}

/** The box as its owner sees it. */
export interface OwnerBox {
    id: string;
    editionId: string;
    /** The link for friends. */
    url: string;
    status: BoxStatus;
    expiresAt: number;
    accepted: number;
    rejected: number;
    /** Public Reverb channel only the owner knows. */
    channel: string;
    contributions: BoxContributionData[];
}

/** What the page of a friend gets. */
export interface FriendBox {
    token: string;
    editionName: string;
    language: Locale;
    status: BoxStatus;
    snapshot: BoxSnapshot;
    limits: {
        name: number;
        text: number;
        firstName: number;
        photoMegabytes: number;
    };
}

export interface CreatedBox extends OwnerBox {
    /** Only in the answer that creates a box: the browser keeps it. */
    ownerSecret?: string;
}
