import type { Localized } from '../../types/game';
import type { PhotoTransform } from '../../types/photos';
import type { Size } from '../../types/print';
import type { CardTextProblem } from './edition-card-text';
import type { BoardProfile } from './print-board';

/** B99: the parts of an edition. Only the board is required. */
type PartId =
    | 'board'
    | 'titleDeeds'
    | 'cards'
    | 'money'
    | 'tokens'
    | 'boxLid'
    | 'houseRules';

export type PartSelection = Record<PartId, boolean>;

/** A photo in a frame. */
export type CheckPhoto = {
    /** Field in the element, such as `photo` or `layer.2`. */
    field: string;
    /** Photo in pixels after EXIF orientation. */
    source: Size;
    transform: PhotoTransform;
    /** The visible frame in mm. */
    frame: Size;
    /** Bleed in mm around the frame that the photo also has to fill (3 for a full-bleed photo, else 0). */
    bleed: number;
    /**
     * The element this photo belongs to when it is shown here as well: a title deed showing the photo of its space
     * (B157). A photo that is too small on both then gives one message, at the space (R5-09).
     */
    borrowedFrom?: string;
};

/** Result of fitting a text, supplied by the text-fitting code (B55, B94). */
type TextFitResult = { fits: true } | { fits: false; excessCharacters: number };

export type CheckText = {
    field: string;
    /** Where the text is printed, for a custom word that is used in several places ("de kaarten"). */
    place?: Localized;
    /** Result at the smallest allowed letter size. */
    fit: TextFitResult;
    /**
     * The letter size the text fits at, in mm. Only given where a tiny letter is a problem of its own: the
     * names on the board (bug 13, ronde 3).
     */
    fontMm?: number;
};

export type CheckElement = {
    /** `space.01`, `card.chance.03`, `deed.24`, `note.50`, ... */
    key: string;
    photos?: readonly CheckPhoto[];
    texts?: readonly CheckText[];
    /** Problems with the variables in a card text (B131). */
    cardText?: readonly CardTextProblem[];
    /** The amount printed under a card, when the card has one; the check compares the text with it. */
    cardAmount?: CheckCardAmount;
    /** Amounts outside 20% of the standard amount (B132). */
    amounts?: readonly CheckAmount[];
};

/** An amount of the edition that is not allowed, with the range that is. */
export type CheckAmount = {
    /** `amounts.price`, `amounts.rent.3`, or `amount` on a card. */
    field: string;
    value: number;
    min: number;
    max: number;
};

/** The amount under a card, with the range it may take (B132, B135). */
export type CheckCardAmount = {
    /** Signed: minus is paid. */
    value: number;
    min: number;
    max: number;
    /** How the amount looks on the card: "€ 18". */
    shown: string;
};

/** A colour chosen for the edition, and what it sits on (B130). */
export type CheckColor = {
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
};

/** What the checks need from a resolved edition. The edition model maps itself onto this. */
export type CheckInput = {
    board: BoardProfile;
    parts: PartSelection;
    elements: readonly CheckElement[];
    /** Keys of the pawns in the set that have no photo; empty or absent when the pawns are off. */
    pawnsWithoutPhoto?: readonly string[];
    /** Colours the edition has changed (accent and colour groups). */
    colors?: readonly CheckColor[];
    /** Keys of cards that have no text yet: extra cards (B135) and cards after "Kaarten leegmaken" (B194). */
    emptyCards?: readonly string[];
    /** Keys of the streets, stations and utilities without a name, after "Namen leegmaken" (B201). */
    emptyNames?: readonly string[];
    /** The house rules card is on, but has no text and no photo (bug 20, ronde 3). */
    houseRulesEmpty?: boolean;
    /** The invitation is in the set, but says nothing yet about when and where: it prints empty dotted lines (R5-28). */
    invitationBlank?: boolean;
    /** Ids of the free layers on the box lid that lie over its title, subtitle or own lines (bug 36 of ronde 3). */
    lidLayersOverText?: readonly string[];
    /** Printed parts the edition name does not fit on, even wrapped at the smallest size (bug 14 of test round 3). */
    longName?: readonly CheckNamePlace[];
    /** What lies over a fold line or a card spot of the board centre (B183, B187). */
    centerOnFold?: readonly CheckFold[];
};

/** Something in the board centre that lies over a fold line or a card spot. */
export type CheckFold = {
    /** `center-place` for the name, photo or logo; `layer.<id>` for a free layer. */
    field: string;
    /** `face`: the middle of a photo over the whole centre, where a face usually is, lies on a fold (B261). */
    what: 'name' | 'photo' | 'logo' | 'layer' | 'face';
};

/** A part where the edition name does not fit its box. */
export type CheckNamePlace = {
    /** The element that shows the name: the rules booklet or a banknote. */
    elementKey: string;
    /** Where it is printed, in a sentence: "het spelregelboekje". */
    place: Localized;
    excessCharacters: number;
};

export type CheckCode =
    | 'photo.low-resolution'
    | 'text.too-long'
    | 'text.too-small'
    | 'text.amount-differs'
    | 'text.amount-direction'
    | 'house-rules.empty'
    | 'invitation.blank'
    | 'text.name-too-long'
    | 'text.unknown-token'
    | 'text.amount-missing'
    | 'text.amount-twice'
    | 'amount.out-of-range'
    | 'text.stale-name'
    | 'board.profile-invalid'
    | 'board.spaces-too-narrow'
    | 'board.center-missing'
    | 'board.home-print-too-big'
    | 'style.out-of-gamut'
    | 'style.low-contrast'
    | 'board.box-lid-too-big'
    | 'parts.board-missing'
    | 'pawns.no-photo'
    | 'card.empty'
    | 'space.no-name'
    | 'layer.over-text'
    | 'center.on-fold';

export type Severity = 'warning' | 'error';

/** B98: an icon and a word with every issue, never colour alone. */
export type IssueIcon = 'triangle-alert' | 'octagon-x';

export type CheckIssue = {
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
    /**
     * Other elements the message is about as well (R5-09): every pawn without a photo shows the one message about
     * the pawns, and the board marks each of them.
     */
    alsoKeys?: readonly string[];
    /** What the message is about when that is a group, such as "Pionnen"; else the element of `elementKey`. */
    about?: Localized;
    /** Numbers behind the message, for the UI. */
    data?: {
        dpi?: number;
        excessCharacters?: number;
        value?: number;
        min?: number;
        max?: number;
        /** Letter size in points, for `text.too-small`. */
        pt?: number;
        /** The amount the text names, signed like the card amount, for `text.amount-differs`. */
        mentioned?: number;
        /** Whether `mentioned` is an amount the card may take, so "Bedrag aanpassen" can use it. */
        allowed?: boolean;
        /** Which way the text says the money goes, for `text.amount-direction`, so one tap can turn the card (R5-11). */
        says?: 'pay' | 'receive';
    };
};
