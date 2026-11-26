import type { Locale } from '@/types/game';

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
    /** The owner keeps the card texts to themselves (B176): the friends' page gets none. */
    cardsHidden?: true;
}

type BoxStatus = 'open' | 'closed';

/** What a contribution proposes, part by part (B175): its name, text or town, its photo and its amount. */
export type ContributionPart = 'name' | 'text' | 'town' | 'photo' | 'amount';

export interface BoxContributionData {
    id: string;
    elementKey: string;
    firstName: string;
    /** `text` for a card, `town` for a colour group, `name` for a space or a pawn. */
    field: 'name' | 'text' | 'town';
    value: string | null;
    /** A signed amount for a card (minus is paid), B175. */
    amount: number | null;
    /** The parts the owner has not applied or passed over yet. */
    open: ContributionPart[];
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
    /** Friends see no card texts (B176). */
    cardsHidden: boolean;
    /** Public Reverb channel only the owner knows. */
    channel: string;
    contributions: BoxContributionData[];
}

/** What the page of a friend gets. */
export interface FriendBox {
    token: string;
    editionName: string;
    language: Locale;
    /** `replaced`: "Nieuwe link" replaced this link; the page only says so (B175). */
    status: BoxStatus | 'replaced';
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
