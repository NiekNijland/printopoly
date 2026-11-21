import type { CurrencyId, Locale } from '@/lib/game/types';
import type { BoardProfile } from '@/lib/print/board';
import type { PatternId } from '@/lib/render/patterns';
import type { PhotoStyle } from '@/lib/render/photo';
import type { SpaceIconPreset } from '@/lib/render/space-icons';

export type { PhotoStyle };

export const EDITION_SCHEMA_VERSION = 1;

export type ThemeId = 'classic' | 'riso' | 'strak';

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
}

/** Free layers on the board centre, the box lid and card backs (B42, B43). */
export type FreeLayer =
    | {
          id: string;
          kind: 'text';
          text: string;
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
    /** Board centre only: the line under the name; an empty string hides it, no value shows the standard tagline. */
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
