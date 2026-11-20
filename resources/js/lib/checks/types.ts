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
    /** Where the text is printed, for a custom word that is used in several places ("de kaarten"). */
    place?: Localized;
    /** Result at the smallest allowed letter size. */
    fit: TextFitResult;
}

export interface CheckElement {
    /** `space.01`, `card.chance.03`, `deed.24`, `note.50`, ... */
    key: string;
    photos?: readonly CheckPhoto[];
    texts?: readonly CheckText[];
}

/** A colour chosen for the edition, and what it sits on (B130). */
export interface CheckColor {
    /** `accent`, or the id of a colour group such as `red`. */
    field: string;
    /** What the colour is called in a message: "Rood" or "Accentkleur". */
    name: Localized;
    /** Colour as `#RRGGBB`. */
    hex: string;
    /** `accent` is printed as text on the board; `bar` is a colour bar with a name on a deed. */
    role: 'accent' | 'bar';
    /** The colour it is printed on: the board colour. */
    against: string;
}

/** What the checks need from a resolved edition. The edition model maps itself onto this. */
export interface CheckInput {
    board: BoardProfile;
    parts: PartSelection;
    elements: readonly CheckElement[];
    /** Keys of the pawns in the set that have no photo; empty or absent when the pawns are off. */
    pawnsWithoutPhoto?: readonly string[];
    /** Colours the edition has changed (accent and colour groups). */
    colors?: readonly CheckColor[];
}

export type CheckCode =
    | 'photo.low-resolution'
    | 'photo.not-covering'
    | 'text.too-long'
    | 'board.profile-invalid'
    | 'board.spaces-too-narrow'
    | 'board.center-missing'
    | 'board.home-print-too-big'
    | 'style.out-of-gamut'
    | 'style.low-contrast'
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
