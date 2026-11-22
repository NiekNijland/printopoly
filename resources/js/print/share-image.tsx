import { useMemo } from 'react';

import { editorSources } from '@/components/editor/element-preview';
import { Board, boardPropsOf } from '@/components/render';
import { resolveEdition } from '@/lib/edition/resolve';
import type { PhotoInfo } from '@/lib/editor/photo-cache';
import type { SharePhoto } from '@/lib/editor/share-board';
import type { PrintEdition } from '@/lib/print/composition';
import { allPartsOn, toEdition } from '@/lib/print/print-edition';

import { useReadySignal } from './print-document';

/**
 * The payload of the picture for "Deel je bord" (B77, B128, B228). It travels through the same `window.__PRINT__` as
 * the PDF parts, with `part: 'share'`: the edition and small copies of the photos on its board, as data URLs, drawn
 * by the same board builder as the editor and the print.
 */
export interface SharePayload {
    part: 'share';
    set: 'printer';
    pageShaveMm: number;
    assetBase?: string;
    labels: { kicker: string; footer: string };
    edition: PrintEdition;
    photos?: SharePhoto[];
}

export function isSharePayload(payload: unknown): payload is SharePayload {
    return (
        typeof payload === 'object' &&
        payload !== null &&
        (payload as { part?: unknown }).part === 'share'
    );
}

/** The page is 1080 CSS pixels square; Chrome prints it and `pdftoppm` makes the 1080 px PNG from it. */
const PAGE_PX = 1080;
const BOARD_PX = 880;
const PX_PER_MM = 96 / 25.4;

const INK = '#1b1f24';
const PAPER = '#fffdf7';
const TABLE = '#e9e3d3';
const PRESS = '#c8321f';

/**
 * A board on the kitchen table: a sheet of paper under it, a red label above and the address below. The board is the
 * one of the editor: names, words, colours and photos (R5-24).
 */
export function ShareImage({ payload }: { payload: SharePayload }) {
    const resolved = useMemo(
        () => resolveEdition(allPartsOn(toEdition(payload.edition))),
        [payload.edition],
    );
    const board = useMemo(() => {
        const photos = new Map<string, PhotoInfo>(
            (payload.photos ?? []).map((photo) => [
                photo.id,
                {
                    id: photo.id,
                    url: photo.src,
                    width: photo.width,
                    height: photo.height,
                },
            ]),
        );

        return boardPropsOf(resolved, editorSources(photos));
    }, [resolved, payload.photos]);
    useReadySignal();

    const profile = resolved.boardProfile;
    // The 4 px border takes 8 px of the width.
    const scale = (BOARD_PX - 8) / (profile.outer * PX_PER_MM);

    return (
        <section
            data-share-image
            style={{
                position: 'relative',
                width: `${String(PAGE_PX)}px`,
                height: `calc(${String(PAGE_PX)}px - ${String(payload.pageShaveMm)}mm)`,
                overflow: 'hidden',
                background: TABLE,
                fontFamily: "'Instrument Sans', sans-serif",
                color: INK,
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: 34,
                    transform: 'translateX(-50%) rotate(-1.5deg)',
                    background: PRESS,
                    color: '#fff',
                    padding: '10px 28px',
                    borderRadius: 6,
                    border: `3px solid ${INK}`,
                    fontWeight: 600,
                    fontSize: 30,
                    whiteSpace: 'nowrap',
                }}
            >
                {payload.labels.kicker}
            </div>

            <div
                style={{
                    position: 'absolute',
                    left: (PAGE_PX - BOARD_PX) / 2,
                    top: 124,
                    width: BOARD_PX,
                    height: BOARD_PX,
                    transform: 'rotate(1.4deg)',
                    background: PAPER,
                    border: `3px solid ${INK}`,
                    borderRadius: 6,
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    left: (PAGE_PX - BOARD_PX) / 2,
                    top: 124,
                    width: BOARD_PX,
                    height: BOARD_PX,
                    border: `4px solid ${INK}`,
                    borderRadius: 6,
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                }}
            >
                <div
                    style={{
                        width: profile.outer * PX_PER_MM,
                        height: profile.outer * PX_PER_MM,
                        transform: `scale(${String(scale)})`,
                        transformOrigin: 'top left',
                    }}
                >
                    <Board {...board} />
                </div>
            </div>

            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 22,
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: 28,
                    letterSpacing: 1,
                }}
            >
                {payload.labels.footer}
            </div>
        </section>
    );
}
