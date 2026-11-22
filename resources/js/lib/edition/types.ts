import type { CurrencyId, Locale } from '@/lib/game/types';
import type { BoardProfile } from '@/lib/print/board';
import type { MoneyAmount } from '@/lib/print/money';
import type { PatternId } from '@/lib/render/patterns';
import type { PhotoStyle } from '@/lib/render/photo';
import type { SpaceIconPreset } from '@/lib/render/space-icons';

export type { PhotoStyle };

export const EDITION_SCHEMA_VERSION = 1;

export type ThemeId = 'classic' | 'riso' | 'strak';

/** The templates a new edition can start from (B127); their data is in `resources/js/data/templates.ts`. */
export const TEMPLATE_IDS = [
    'village',
    'friends',
    'company',
    'school',
    'club',
    'bachelor',
    'wedding',
    'birthday',
    'kidsparty',
    'family',
] as const;

/**
 * Earlier versions of a template that was rewritten (B193): "Club of vereniging" as a football club and the
 * Verjaardag from before the split into Verjaardag and Kinderfeest. Nobody starts from them; an edition made from
 * the old version keeps it as its baseline, so its untouched texts stay as they are and count as no change.
 */
export const LEGACY_TEMPLATE_IDS = ['club1', 'birthday1'] as const;

export type TemplateId =
    (typeof TEMPLATE_IDS)[number] | (typeof LEGACY_TEMPLATE_IDS)[number];

/** Every template an edition can carry: the ones on offer and the earlier versions. */
export const KNOWN_TEMPLATE_IDS: readonly TemplateId[] = [
    ...TEMPLATE_IDS,
    ...LEGACY_TEMPLATE_IDS,
];

export function isTemplateId(value: unknown): value is TemplateId {
    return (
        typeof value === 'string' &&
        (KNOWN_TEMPLATE_IDS as readonly string[]).includes(value)
    );
}

export const THEME_IDS: readonly ThemeId[] = ['classic', 'riso', 'strak'];

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
    | 'foldModels'
    | 'dice'
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
    'foldModels',
    'dice',
    'invitation',
];

/**
 * The extra print items (B123). They came after the first editions were stored, so an edition without
 * them counts them as off instead of being rejected.
 */
export const EXTRA_PART_IDS: readonly PartId[] = [
    'rulesBooklet',
    'foldModels',
    'dice',
    'invitation',
];

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
    foldModels: false,
    dice: false,
    invitation: false,
};

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
