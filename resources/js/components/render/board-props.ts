import { BOARD_CENTER_KEY } from '@/lib/render/edition-keys';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import type {
    FreeLayer,
    PhotoPlacement,
    PhotoStyle,
    SpaceIcon,
} from '@/lib/render/edition-types';
import { renderWords } from '@/lib/render/edition-words';
import type { PhotoSource } from '@/lib/render/photo';
import { buildStyle } from '@/lib/render/style';

import { centerTitleOf, type BoardProps, type SpaceOverride } from './board';
import type { RenderLayer } from './free-layers';
import type { SpaceIconSource } from './space-icon';

/**
 * How a caller turns stored photos into sources: the editor from the photos in this browser, the print page from
 * the crops the server made. Each gets the element key and the placement, and uses what it needs.
 */
export interface BoardSources {
    photo: (
        key: string,
        placement: PhotoPlacement | undefined,
        style?: PhotoStyle,
        field?: 'photo' | 'background',
    ) => PhotoSource | undefined;
    icon: (
        key: string,
        icon: SpaceIcon | undefined,
    ) => SpaceIconSource | undefined;
    layers: (key: string, layers: readonly FreeLayer[]) => RenderLayer[];
}

/** Sources that draw no photos: the board with its names, colours and words only. */
export const NO_PHOTOS: BoardSources = {
    photo: () => undefined,
    icon: (_key, icon) =>
        icon !== undefined && 'preset' in icon
            ? { preset: icon.preset }
            : undefined,
    layers: (_key, layers) =>
        layers.flatMap((layer) =>
            layer.kind === 'text' ? [{ ...layer }] : [],
        ),
};

/** The props every board shares: theme, language, currency with its own sign, words and colours. */
export function editionLook(resolved: ResolvedEdition) {
    const style = buildStyle(resolved);

    return {
        theme: resolved.theme,
        locale: resolved.language,
        currency: resolved.currency.id,
        words: renderWords(resolved.words),
        ...(style === undefined ? {} : { style }),
    } as const;
}

/**
 * Everything the board of an edition needs, built in one place (ronde 3, bug 5): theme, accent and group colours,
 * the currency with its own sign, the edition's words, the names, towns, corner texts, amounts, photos and icons
 * of the spaces, and the centre with its title, subtitle, photo, logo, background and layers. The editor, the
 * Voorbeeld, the print page thumbnail, the print itself and the invitation all draw the board from this, so it
 * looks the same everywhere.
 */
export function boardPropsOf(
    resolved: ResolvedEdition,
    sources: BoardSources = NO_PHOTOS,
): BoardProps {
    const spaces: Record<number, SpaceOverride> = {};

    for (const space of resolved.spaces) {
        const photo = sources.photo(space.key, space.photo, space.photoStyle);
        const icon = sources.icon(space.key, space.icon);

        spaces[space.position] = {
            space: space.base,
            name: space.name,
            ...(space.town === undefined ? {} : { town: space.town }),
            ...(space.text === undefined ? {} : { text: space.text }),
            ...(photo === undefined ? {} : { photo }),
            ...(icon === undefined ? {} : { icon }),
        };
    }

    const centre = resolved.boardCenter;

    return {
        ...editionLook(resolved),
        editionName: centre.name ?? resolved.name,
        profile: resolved.boardProfile,
        spaces,
        centerLayers: sources.layers(BOARD_CENTER_KEY, centre.layers),
        centerTitle: centerTitleOf(
            centre,
            sources.photo(BOARD_CENTER_KEY, centre.photo),
            sources.photo(
                BOARD_CENTER_KEY,
                centre.background,
                undefined,
                'background',
            ),
        ),
    };
}
