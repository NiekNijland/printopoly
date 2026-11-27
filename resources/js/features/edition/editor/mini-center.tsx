import { useEffect, useMemo, useRef, useState } from 'react';

import { BoardCenter } from '@/components/render/board';
import {
    boardPropsOf,
    editionLook,
    NO_PHOTOS,
} from '@/components/render/board-props';
import { editorSources } from '@/components/render/editor-element-preview';
import { resolveEdition } from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { centerRect } from '@/lib/render/print-board';

const PX_PER_MM = 96 / 25.4;

/**
 * The real centre of the board, scaled down to its cell of the mini board (ronde 4, Mila, bug 37): the colour of
 * the theme, the photo or logo, the photo over the whole centre and the ribbon with the same line breaks as the
 * preview and the PDF, because it is the same renderer.
 */
export const MiniCenter = ({
    edition,
    photos,
}: {
    edition: Edition;
    photos?: PhotoInfos;
}) => {
    const box = useRef<HTMLSpanElement>(null);
    const [width, setWidth] = useState(0);
    const resolved = useMemo(() => resolveEdition(edition), [edition]);
    const centre = centerRect(edition.boardProfile);

    useEffect(() => {
        const node = box.current;
        if (node === null) {
            return;
        }
        const measure = (): void => setWidth(node.clientWidth);
        measure();
        if (typeof ResizeObserver === 'undefined') {
            return;
        }
        const observer = new ResizeObserver(measure);
        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    const props = boardPropsOf(
        resolved,
        photos === undefined ? NO_PHOTOS : editorSources(photos),
    );
    const scale = width / (centre.w * PX_PER_MM);

    return (
        <span
            ref={box}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 block overflow-hidden"
            data-testid="mini-center"
        >
            {/* Hidden until the cell is measured, so it never flashes at full size. */}
            <span
                className="absolute top-0 left-0 block"
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: '0 0',
                    visibility: width > 0 ? undefined : 'hidden',
                }}
            >
                <BoardCenter
                    {...editionLook(resolved)}
                    editionName={props.editionName}
                    profile={edition.boardProfile}
                    title={props.centerTitle}
                    layers={props.centerLayers}
                />
            </span>
        </span>
    );
};
