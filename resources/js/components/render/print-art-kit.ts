import type { BoardSources } from '@/components/render/board-props';
import type { RenderLayer } from '@/components/render/free-layers';
import type { SpaceIconSource } from '@/components/render/space-icon';
import { spaceKey } from '@/lib/render/edition-keys';
import type { FreeLayer } from '@/lib/render/edition-types';
import { renderWords } from '@/lib/render/edition-words';
import type { PhotoSource } from '@/lib/render/photo';
import { BLEED } from '@/lib/render/print-composition';
import { standardEdition } from '@/lib/render/standard-edition';
import { buildStyle } from '@/lib/render/style';
import type { DeckId } from '@/types/game';

import type { ArtContext } from './print-item-art';

/** Bleed of a home space sticker: the sticker is 0.5 mm inside the space and has 3 mm bleed (B65). */
export const STICKER_BLEED = BLEED - 0.5;

export type ArtKit = {
    ctx: ArtContext;
    photo: (
        key: string,
        field?: 'photo' | 'background',
    ) => PhotoSource | undefined;
    icon: (key: string) => SpaceIconSource | undefined;
    layers: (layers: readonly FreeLayer[]) => RenderLayer[];
};

/** The icon of the first Chance or Community Chest space that has one, for the standard back of that deck (B136). */
export const deckIconOf = (
    kit: ArtKit,
    deck: DeckId,
): SpaceIconSource | undefined => {
    for (const space of standardEdition.spaces) {
        const icon =
            space.type === deck
                ? kit.icon(spaceKey(space.position))
                : undefined;

        if (icon !== undefined) {
            return icon;
        }
    }

    return undefined;
};

export const common = (ctx: ArtContext, bleedMm: number) => {
    const style = buildStyle(ctx.resolved);

    return {
        theme: ctx.resolved.theme,
        locale: ctx.resolved.language,
        currency: ctx.resolved.currency.id,
        words: renderWords(ctx.resolved.words),
        bleedMm,
        ...(style === undefined ? {} : { style }),
    } as const;
};

export const deckOf = (key: string): DeckId | null => {
    const deck = key.split('.')[1];

    return deck === 'chance' || deck === 'chest' ? deck : null;
};

export const centreName = (ctx: ArtContext): string => {
    return ctx.resolved.boardCenter.name ?? ctx.resolved.name;
};

/** The board sources of the print: the crops the server made for each frame (bug 5 of ronde 3). */
export const printSources = (kit: ArtKit): BoardSources => {
    return {
        photo: (key, _placement, _style, field) => kit.photo(key, field),
        icon: (key) => kit.icon(key),
        layers: (_key, layers) => kit.layers(layers),
    };
};
