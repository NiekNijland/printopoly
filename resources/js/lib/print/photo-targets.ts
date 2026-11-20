import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { partOfKey } from '@/lib/edition/keys';
import { resolveEdition } from '@/lib/edition/resolve';
import type { Edition } from '@/lib/edition/types';
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

/**
 * The size of the frame each placed photo has when printed, taken from the renderers themselves: every
 * element is drawn the way `ItemArt` draws it (same component, same bleed) with a stand-in photo, and the
 * size of the photo slot it draws is read back. So the crop the server makes always fits what the renderer
 * draws, and nothing here repeats the geometry of a layout.
 *
 * A photo the layout does not show (the "text" layout) has no slot and so no target: the server does not
 * crop it. Photos on free layers carry their own size and are not listed.
 */
export function photoTargets(edition: Edition): PhotoTargets {
    const full = allPartsOn(edition);
    const resolved = resolveEdition(full);
    const targets: PhotoTargets = { printer: {}, home: {} };

    for (const [key, override] of Object.entries(edition.elements)) {
        const part = partOfKey(key);

        if (override.photo === undefined || part === null) {
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
