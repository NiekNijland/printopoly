import type { CurrencyId, Locale } from '@/lib/game/types';
import type { BoardProfile } from '@/lib/print/board';
import type { MoneyAmount } from '@/lib/print/money';
import type { PatternId } from '@/lib/render/patterns';
import type { PhotoStyle } from '@/lib/render/photo';
import type { SpaceIconPreset } from '@/lib/render/space-icons';

export type { PhotoStyle };

export const EDITION_SCHEMA_VERSION = 1;

export type ThemeId = 'classic' | 'riso' | 'strak' | 'gala';

/**
 * The templates a new edition can start from (B127, B201), in display order. Leeg (the standard edition) comes
 * first on screen and is no template. Their data is in `resources/js/data/templates.ts`.
 */
export const TEMPLATE_IDS = [
    'village',
    'family',
    'friends',
    'party',
    'wedding',
    'group',
] as const;

/**
 * Templates nobody starts from any more (B201), kept as the baseline of editions that started from them (B152), so
 * their untouched texts stay as they are and count as no change. The first six were on offer until round 5; `club1`
 * and `birthday1` are the versions of Club of vereniging and Verjaardag from before they were rewritten (B193).
 */
export const HIDDEN_TEMPLATE_IDS = [
    'company',
    'school',
    'club',
    'bachelor',
    'birthday',
    'kidsparty',
    'club1',
    'birthday1',
] as const;

/**
 * The start Leeg (B259): no template, but the standard edition with empty names and card texts. The edition keeps
 * it as its template, so its baseline is that empty edition and an untouched Leeg shows no change dots.
 */
export const EMPTY_TEMPLATE = 'empty';

export type TemplateId =
    | (typeof TEMPLATE_IDS)[number]
    | (typeof HIDDEN_TEMPLATE_IDS)[number]
    | typeof EMPTY_TEMPLATE;

/** Every template an edition can carry: the ones on offer, the hidden ones and Leeg. */
export const KNOWN_TEMPLATE_IDS: readonly TemplateId[] = [
    ...TEMPLATE_IDS,
    ...HIDDEN_TEMPLATE_IDS,
    EMPTY_TEMPLATE,
];

/** Whether a new edition can start from this template: one of the seven starts on Nieuwe editie (B201). */
export function isOfferedTemplate(
    value: unknown,
): value is (typeof TEMPLATE_IDS)[number] {
    return (
        typeof value === 'string' &&
        (TEMPLATE_IDS as readonly string[]).includes(value)
    );
}

export function isTemplateId(value: unknown): value is TemplateId {
    return (
        typeof value === 'string' &&
        (KNOWN_TEMPLATE_IDS as readonly string[]).includes(value)
    );
}

export const THEME_IDS: readonly ThemeId[] = [
    'classic',
    'riso',
    'strak',
    'gala',
];

/** Parts of an edition (B99). The board is always on. */
export type PartId =
    | 'board'
    | 'deeds'
    | 'cards'
    | 'money'
    | 'pawns'
    | 'boxLid'
    | 'houseRules'
    | 'rulesBooklet'
    | 'invitation';

export const PART_IDS: readonly PartId[] = [
    'board',
    'deeds',
    'cards',
    'money',
    'pawns',
    'boxLid',
    'houseRules',
    'rulesBooklet',
    'invitation',
];

/**
 * The extra print items (B123). They came after the first editions were stored, so an edition without
 * them counts them as off instead of being rejected.
 */
export const EXTRA_PART_IDS: readonly PartId[] = ['rulesBooklet', 'invitation'];

export type Parts = Record<PartId, boolean>;

export const DEFAULT_PARTS: Readonly<Parts> = {
    board: true,
    deeds: true,
    cards: true,
    money: false,
    pawns: false,
    boxLid: false,
    houseRules: false,
    rulesBooklet: false,
    invitation: false,
};

/**
 * The edition parts a print set can hold (B198, B210), in this order. The editor reads them by these names
 * (`partsInSet` in lib/editor/print-selection.ts); the print page groups them into its rows (lib/print/selection.ts):
 * the row Kaarten is `deeds`, `cards` and `houseRules`. The same as `PrintSelection::PARTS` on the server. The dice
 * and the houses and hotels are gone (B200).
 */
export const PRINT_SELECTION_PART_IDS: readonly PartId[] = [
    'board',
    'deeds',
    'cards',
    'houseRules',
    'money',
    'pawns',
    'boxLid',
    'invitation',
    'rulesBooklet',
];

/**
 * What goes in the print set (B198, B199), chosen on the print page only: the set chosen there last and the parts
 * ticked for it. The editor reads `parts` to show what is not in the set; nothing else writes it. Absent until the
 * print page saves a choice: then `defaultPrintSelection` in lib/print/selection.ts gives the parts, from the
 * edition's own `parts`, and the home set (B199). The board is always in it.
 */
export interface PrintSelection {
    set: 'home' | 'printer';
    parts: PartId[];
}

/** Photo position, normalised so it survives a change of the box it sits in (B61). */
export interface PhotoPlacement {
    /** Id in the photo store of this browser. */
    photoId: string;
    /** Centre of the visible crop as a fraction of the photo (0 to 1). */
    cx: number;
    cy: number;
    /** 1 fills the box exactly; larger zooms in. */
    scale: number;
    /** Degrees, multiples of 90 or free. */
    rotation: number;
    grayscale: boolean;
    /**
     * Fit instead of fill (ronde 3, B168): the whole photo shows inside the frame at 100%, with the paper of the
     * element around it, and `scale` may go below 1. Absent means fill.
     */
    fit?: boolean;
    /**
     * Never stored: resolve sets it on the photo a title deed borrows from its space (B157). That photo gets the
     * crop of the deed's own narrow frame once its size is known (`deedCrop`, B177), not the crop of the space.
     */
    borrowed?: true;
}

/** The letter of a text layer: the heading font (the default), the body font or the mono font. */
export type LayerFont = 'heading' | 'body' | 'mono';

export const LAYER_FONTS: readonly LayerFont[] = ['heading', 'body', 'mono'];

export type LayerAlign = 'left' | 'center' | 'right';

export const LAYER_ALIGNS: readonly LayerAlign[] = ['left', 'center', 'right'];

/** Free layers on the board centre, the box lid and card backs (B42, B43). */
export type FreeLayer =
    | {
          id: string;
          kind: 'text';
          text: string;
          /** `#RRGGBB`; the ink of the theme when absent. */
          color?: string;
          /** The heading font when absent. */
          font?: LayerFont;
          /** Centred when absent. */
          align?: LayerAlign;
          x: number;
          y: number;
          w: number;
          h: number;
          /** Degrees clockwise around the middle of the layer; 0 when absent. */
          rotation?: number;
      }
    | {
          id: string;
          kind: 'photo';
          photo: PhotoPlacement;
          x: number;
          y: number;
          w: number;
          h: number;
          rotation?: number;
      };

/** What the middle of the board shows (B125): the edition name on a plate, the name with a photo above it, or a logo. */
export type CenterMode = 'name' | 'photo' | 'logo';

export const CENTER_MODES: readonly CenterMode[] = ['name', 'photo', 'logo'];

/**
 * The image of a special space (B136): one of our own icons, or an uploaded image. `aspect` is the width
 * over the height of the uploaded image, so it is drawn whole (never cropped) inside the icon box.
 */
export type SpaceIcon =
    { preset: SpaceIconPreset } | { photo: PhotoPlacement; aspect: number };

/** Only what differs from the standard data is stored (B59). */
export interface ElementOverride {
    name?: string;
    /** Town of a colour group (`group.brown`); shown small above the street names in that group. */
    town?: string;
    text?: string;
    photo?: PhotoPlacement;
    /** Framed or over the whole space (B124); absent means framed. Only used when there is a photo. */
    photoStyle?: PhotoStyle;
    /** Amount on a card, signed (plus is received, minus is paid), within 20% of the standard amount (B132). */
    amount?: number;
    /** What the amount on a card is for ("your language course"), printed after the amount line. */
    purpose?: string;
    /** Amounts of a space within 20% of the standard ones (B132): `price`, `rent.0`, `houseCost`, `mortgage`, `amount`, `salary`. */
    amounts?: Record<string, number>;
    layers?: FreeLayer[];
    /**
     * `#RRGGBB`: the paper of a banknote (B85), the colour of a colour group (`group.brown`) or
     * the accent of the edition (`theme_accent`).
     */
    color?: string;
    /** Board centre only (B125): name only (the default), name with a photo above it, or a logo instead of the name. */
    centerMode?: CenterMode;
    /**
     * The line under the name on the board centre and the box lid, and the small line above the headline of the
     * invitation (B169): an empty string hides it, no value shows the standard line.
     */
    subtitle?: string;
    /** Board centre only: width divided by height of the placed photo or logo, so the frame has its shape. */
    photoAspect?: number;
    /** Board centre only (B125): a photo over the whole centre, behind the card spots and the title. */
    background?: PhotoPlacement;
    /** Board centre only: a frame around the photo above the name; `false` for a cut-out PNG. Framed when absent. */
    photoFrame?: boolean;
    /** Built-in pattern of a card back (B130). */
    pattern?: PatternId;
    /** Special spaces only (B136): the icon or uploaded image instead of the standard icon. */
    icon?: SpaceIcon;
    /**
     * Street, station or utility only (B157): `false` keeps the photo of the space off its title deed. Absent
     * means the photo shows on the deed too, unless the deed has a photo of its own.
     */
    deedPhoto?: boolean;
    /**
     * Board centre and box lid (B170): where the title sits, from -1 (top) to 1 (bottom); 0 or absent is the
     * standard place.
     */
    titleOffset?: number;
    /** Board centre only (B170): the size of the title ribbon, from 0.5 to 1; absent is full size. */
    titleScale?: number;
    /** Board centre only (B170): `true` hides the title ribbon, for a centre that is all photo. */
    titleHidden?: boolean;
    /**
     * Board centre only (B187): where the title, photo or logo sit. Absent is the free square top right, clear of
     * the fold lines; `bottomLeft` is the other free square, `middle` is across the fold lines.
     */
    centerPlace?: 'bottomLeft' | 'middle';
    /** Board centre only (B187): `true` lays the logo on the diagonal; absent is straight. */
    logoTilt?: boolean;
    /** Box lid only (B170): `false` takes the light band from under the title on a photo over the whole lid. */
    titleBand?: boolean;
    /** A pawn that is taken out of the set; it stays in the edition so it can come back. */
    hidden?: boolean;
    /** An extra Chance or Community Chest card after the standard 16 (B135); always `true` when present. */
    added?: boolean;
}

export type ElementField = keyof ElementOverride;

export type Elements = Record<string, ElementOverride>;

export interface Edition {
    schemaVersion: number;
    id: string;
    name: string;
    language: Locale;
    currency: CurrencyId;
    theme: ThemeId;
    boardProfile: BoardProfile;
    parts: Parts;
    elements: Elements;
    /**
     * The template the edition started from (B152): "Standaard" goes back to the template, not to the standard
     * game. Absent for an edition that started blank, and for editions made before B152 (then it is inferred).
     */
    template?: TemplateId;
    /**
     * How much play money to print (B156). Absent means the default of each set: 2 to 4 players at home, the full
     * bank at the print shop. The print page can choose again per set.
     */
    moneyAmount?: MoneyAmount;
    /** What goes in the print set (B198); absent until the print page chose. */
    printSelection?: PrintSelection;
    /** Goes up by one on every saved change; used to detect two windows (B60). */
    revision: number;
    createdAt: number;
    updatedAt: number;
}

/** One change to one element; `undefined` means "no override". */
export interface ElementChange {
    key: string;
    before: ElementOverride | undefined;
    after: ElementOverride | undefined;
}

export interface EditionPatch {
    /** Revision the patch was made against. */
    baseRevision: number;
    name?: string;
    language?: Locale;
    currency?: CurrencyId;
    theme?: ThemeId;
    boardProfile?: BoardProfile;
    parts?: Parts;
    /** `null` goes back to the default of each set. */
    moneyAmount?: MoneyAmount | null;
    /** `null` forgets the choice of the print page. */
    printSelection?: PrintSelection | null;
    /** `null` removes the override. */
    elements?: Record<string, ElementOverride | null>;
}

export interface NewEditionInput {
    name: string;
    language: Locale;
    currency?: CurrencyId;
    theme: ThemeId;
    boardProfile: BoardProfile;
    parts?: Partial<Parts>;
}

export interface EditionSummary {
    id: string;
    name: string;
    language: Locale;
    theme: ThemeId;
    revision: number;
    updatedAt: number;
    createdAt: number;
    /** Elements with an override, per kind. */
    customizedSpaces: number;
    customizedElements: number;
}

export interface PhotoRecord {
    id: string;
    editionId: string;
    /** The original (or the JPEG/PNG made from a HEIC): this is what the print job needs. */
    blob: Blob;
    /** WebP of at most 1600 px on the long side, for the screen. Without it `blob` is shown. */
    preview?: Blob;
    /** Pixel size of the original after EXIF orientation. */
    width: number;
    height: number;
    fileName?: string;
    createdAt: number;
}

/**
 * A print job this browser started for one of its editions without an account (bug 14 of the integration check).
 * The token is the secret of the job; Mijn edities sends it to ask whether a set is ready.
 */
export interface PrintJobRecord {
    token: string;
    editionId: string;
    /** The revision of the edition when the job was made: a later revision means the set is outdated. */
    revision: number;
    createdAt: number;
}

export function isThemeId(value: unknown): value is ThemeId {
    return (
        typeof value === 'string' &&
        (THEME_IDS as readonly string[]).includes(value)
    );
}
