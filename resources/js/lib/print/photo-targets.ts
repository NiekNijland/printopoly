import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { withDeedPhotos } from '@/lib/edition/deed-photos';
import {
    BOARD_CENTER_KEY,
    cardBackKey,
    deedKey,
    partOfKey,
} from '@/lib/edition/keys';
import { resolveEdition } from '@/lib/edition/resolve';
import type { Edition } from '@/lib/edition/types';
import { deedsFor, spaceAt } from '@/lib/game/standard-edition';
import { centerRect } from '@/lib/print/board';
import { ElementArt, type ArtContext } from '@/print/item-art';

import type { PrintSet } from './composition';
import { allPartsOn } from './print-edition';

export interface PhotoTarget {
    w: number;
    h: number;
}

/** Per set, `element#photo` to the frame the photo is cropped to, in mm and with bleed. */
export type PhotoTargets = Record<PrintSet, Record<string, PhotoTarget>>;

export const PRINT_SETS: readonly PrintSet[] = ['printer', 'home'];

const FILLED = /data-photo="filled" data-w="([\d.]+)" data-h="([\d.]+)"/;
const ICON_FILLED =
    /data-icon-photo="filled" data-w="([\d.]+)" data-h="([\d.]+)"/g;

/**
 * Where the uploaded icon of a special space is drawn (B136): on the space, on the deed of a station or a
 * utility, and on the standard back of its deck. Each key is drawn only when its part is on.
 */
function iconHosts(key: string, edition: Edition): string[] {
    const position = Number(key.split('.')[1]);
    const space = spaceAt(position);
    const hosts = [key];
    const deed = deedsFor().findIndex(
        (candidate) => candidate.position === position,
    );

    if (deed >= 0 && space.type !== 'street') {
        hosts.push(deedKey(deed + 1));
    }

    if (
        (space.type === 'chance' || space.type === 'chest') &&
        edition.elements[cardBackKey(space.type)]?.photo === undefined
    ) {
        hosts.push(cardBackKey(space.type));
    }

    return hosts.filter((host) => {
        const part = partOfKey(host);

        return part !== null && edition.parts[part];
    });
}

/** The largest frame an uploaded icon is drawn in within one set, so the crop is sharp everywhere it shows. */
function measureIcon(
    key: string,
    edition: Edition,
    full: Edition,
    resolved: ReturnType<typeof resolveEdition>,
    set: PrintSet,
): PhotoTarget | undefined {
    const ctx: ArtContext = {
        edition: full,
        resolved,
        set,
        parts: edition.parts,
        measure: true,
    };
    let best: PhotoTarget | undefined;

    for (const host of iconHosts(key, edition)) {
        const html = renderToStaticMarkup(
            createElement(ElementArt, { ctx, elementKey: host }),
        );

        for (const found of html.matchAll(ICON_FILLED)) {
            const w = Number(found[1]);
            const h = Number(found[2]);

            if (best === undefined || w * h > best.w * best.h) {
                best = {
                    w: Math.round(w * 100) / 100,
                    h: Math.round(h * 100) / 100,
                };
            }
        }
    }

    return best;
}

/** The print frame of every uploaded icon (B136) in the printer set, for the checks: `space.NN` to its size. */
export function iconTargets(edition: Edition): Record<string, PhotoTarget> {
    const full = allPartsOn(edition);
    const resolved = resolveEdition(full);
    const out: Record<string, PhotoTarget> = {};

    for (const [key, override] of Object.entries(edition.elements)) {
        if (override.icon === undefined || !('photo' in override.icon)) {
            continue;
        }

        const target = measureIcon(key, edition, full, resolved, 'printer');

        if (target !== undefined) {
            out[key] = target;
        }
    }

    return out;
}

/**
 * The size of the frame each placed photo has when printed, taken from the renderers themselves: every
 * element is drawn the way `ItemArt` draws it (same component, same bleed) with a stand-in photo, and the
 * size of the photo slot it draws is read back. So the crop the server makes always fits what the renderer
 * draws, and nothing here repeats the geometry of a layout.
 *
 * A photo the layout does not show (the "text" layout) has no slot and so no target: the server does not
 * crop it. Photos on free layers carry their own size and are not listed.
 */
export function photoTargets(stored: Edition): PhotoTargets {
    // A deed shows the photo of its space (B157): it needs a crop of its own frame, so it gets a placement.
    const edition = withDeedPhotos(stored);
    const full = allPartsOn(edition);
    const resolved = resolveEdition(full);
    const targets: PhotoTargets = { printer: {}, home: {} };

    for (const [key, override] of Object.entries(edition.elements)) {
        const part = partOfKey(key);

        if (part === null) {
            continue;
        }

        // The photo over the whole centre has the size of the centre in both sets (B125).
        if (
            key === BOARD_CENTER_KEY &&
            override.background !== undefined &&
            edition.parts[part]
        ) {
            const centre = centerRect(edition.boardProfile);

            for (const set of PRINT_SETS) {
                targets[set][`${key}#background`] = {
                    w: centre.w,
                    h: centre.h,
                };
            }
        }

        if (override.icon !== undefined && 'photo' in override.icon) {
            for (const set of PRINT_SETS) {
                const best = measureIcon(key, edition, full, resolved, set);

                if (best !== undefined) {
                    targets[set][`${key}#icon`] = best;
                }
            }
        }

        if (override.photo === undefined) {
            continue;
        }

        if (!edition.parts[part]) {
            continue;
        }

        for (const set of PRINT_SETS) {
            const ctx: ArtContext = {
                edition: full,
                resolved,
                set,
                parts: edition.parts,
                measure: true,
            };
            const html = renderToStaticMarkup(
                createElement(ElementArt, { ctx, elementKey: key }),
            );
            const found = FILLED.exec(html);

            if (found?.[1] !== undefined && found[2] !== undefined) {
                targets[set][`${key}#photo`] = {
                    w: Math.round(Number(found[1]) * 100) / 100,
                    h: Math.round(Number(found[2]) * 100) / 100,
                };
            }
        }
    }

    return targets;
}
