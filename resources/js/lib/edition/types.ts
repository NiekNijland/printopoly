import type { CurrencyId, Locale } from '@/lib/game/types';
import type { BoardProfile } from '@/lib/print/board';

export const EDITION_SCHEMA_VERSION = 1;

export type ThemeId = 'classic' | 'riso' | 'strak';

export const THEME_IDS: readonly ThemeId[] = ['classic', 'riso', 'strak'];

/** Layout variants have fixed ids that never disappear (B60). */
export type LayoutId = 'frame' | 'full' | 'text';

export const LAYOUT_IDS: readonly LayoutId[] = ['frame', 'full', 'text'];

/** What an unsupported layout turns into when the theme changes. */
export const FALLBACK_LAYOUT: LayoutId = 'frame';

/** Parts of an edition (B99). The board is always on. */
export type PartId =
    'board' | 'deeds' | 'cards' | 'money' | 'pawns' | 'boxLid' | 'houseRules';

export const PART_IDS: readonly PartId[] = [
    'board',
    'deeds',
    'cards',
    'money',
    'pawns',
    'boxLid',
    'houseRules',
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
      }
    | {
          id: string;
          kind: 'photo';
          photo: PhotoPlacement;
          x: number;
          y: number;
          w: number;
          h: number;
      };

/** Only what differs from the standard data is stored (B59). */
export interface ElementOverride {
    name?: string;
    text?: string;
    layout?: LayoutId;
    photo?: PhotoPlacement;
    /** Amount on a card (B32). Board values are fixed (B29, B58). */
    amount?: number;
    layers?: FreeLayer[];
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

export function isThemeId(value: unknown): value is ThemeId {
    return (
        typeof value === 'string' &&
        (THEME_IDS as readonly string[]).includes(value)
    );
}
