import type { CardTextProblem } from '../edition/card-text';
import type { Localized } from '../game/types';
import type { PhotoTransform } from '../photos/types';
import type { BoardProfile } from '../print/board';
import type { Size } from '../print/types';

/** B99: the parts of an edition. Only the board is required. */
export type PartId =
    | 'board'
    | 'titleDeeds'
    | 'cards'
    | 'money'
    | 'tokens'
    | 'boxLid'
    | 'houseRules';

export type PartSelection = Record<PartId, boolean>;

/** A photo in a frame. */
export interface CheckPhoto {
    /** Field in the element, such as `photo` or `layer.2`. */
    field: string;
    /** Photo in pixels after EXIF orientation. */
    source: Size;
    transform: PhotoTransform;
    /** The visible frame in mm. */
    frame: Size;
    /** Bleed in mm around the frame that the photo also has to fill (3 for a full-bleed photo, else 0). */
    bleed: number;
}

/** Result of fitting a text, supplied by the text-fitting code (B55, B94). */
export type TextFitResult =
    { fits: true } | { fits: false; excessCharacters: number };

export interface CheckText {
    field: string;
    /** Result at the smallest allowed letter size. */
    fit: TextFitResult;
}

export interface CheckElement {
    /** `space.01`, `card.chance.03`, `deed.24`, `note.50`, ... */
    key: string;
    photos?: readonly CheckPhoto[];
    texts?: readonly CheckText[];
    /** Problems with the variables in a card text (B126). */
    cardText?: readonly CardTextProblem[];
}

/** What the checks need from a resolved edition. The edition model maps itself onto this. */
export interface CheckInput {
    board: BoardProfile;
    parts: PartSelection;
    elements: readonly CheckElement[];
    /** Keys of the pawns in the set that have no photo; empty or absent when the pawns are off. */
    pawnsWithoutPhoto?: readonly string[];
}

export type CheckCode =
    | 'photo.low-resolution'
    | 'photo.not-covering'
    | 'text.too-long'
    | 'text.unknown-token'
    | 'text.amount-missing'
    | 'text.stale-name'
    | 'board.profile-invalid'
    | 'board.spaces-too-narrow'
    | 'board.center-missing'
    | 'board.home-print-too-big'
    | 'board.box-lid-too-big'
    | 'parts.board-missing'
    | 'pawns.no-photo';

export type Severity = 'warning' | 'error';

/** B98: an icon and a word with every issue, never colour alone. */
export type IssueIcon = 'triangle-alert' | 'octagon-x';

export interface CheckIssue {
    /** Stable: `code|elementKey|field`. */
    id: string;
    code: CheckCode;
    /** `space.01`, `card.chance.03`, `board`, `parts`, ... */
    elementKey: string;
    field: string;
    severity: Severity;
    icon: IssueIcon;
    /** The word shown next to the icon: "Waarschuwing" or "Fout". */
    severityLabel: Localized;
    message: Localized;
    /** Numbers behind the message, for the UI. */
    data?: { dpi?: number; excessCharacters?: number };
}
