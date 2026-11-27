import { useLayoutEffect, useRef, useState } from 'react';

import { editElement } from '@/features/edition/editor/edit';
import type { lookupResolved } from '@/features/edition/editor/lookup';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { deedCrop } from '@/lib/render/edition-deed-photos';
import type { Edition } from '@/lib/render/edition-types';
import { readProbe } from '@/lib/render/editor-checks-input';
import { photoBleed } from '@/lib/render/editor-photo-bleed';
import type { PhotoCache } from '@/lib/render/editor-photo-cache';
import {
    actOnPlacement,
    type PlacementAction,
    type PlacementContext,
} from '@/lib/render/editor-placements';
import { MAX_ZOOM, minZoom } from '@/lib/render/photos-transform';
import type { Size } from '@/types/print';

const sameSize = (a: Size | null, b: Size | null): boolean => {
    return a === b || (a !== null && b !== null && a.w === b.w && a.h === b.h);
};

type Translate = ReturnType<typeof useTranslation>;

const photoMoves = (
    photo: { scale: number } & Parameters<typeof minZoom>[0],
    act: (action: PlacementAction, text?: string) => void,
    t: Translate,
    zoomText: (scale: number) => string,
) => ({
    onPan: (dxMm: number, dyMm: number) => act({ type: 'pan', dxMm, dyMm }),
    onNudge: (direction: 'left' | 'right' | 'up' | 'down') =>
        act(
            { type: 'nudge', direction },
            t('editor.moved', {
                direction: t(`editor.dir_${direction}`),
            }),
        ),
    onZoomFactor: (factor: number) =>
        act({
            type: 'zoom-to',
            scale: photo.scale * factor,
        }),
    onZoomStep: (direction: 1 | -1) =>
        act(
            { type: 'zoom-by', delta: 0.1 * direction },
            zoomText(
                Math.min(
                    MAX_ZOOM,
                    Math.max(minZoom(photo), photo.scale + 0.1 * direction),
                ),
            ),
        ),
});

type PhotoGesturesInput = {
    session: EditionSession;
    editKey: string;
    targetKey: string;
    part: ReturnType<typeof lookupResolved>;
    photos: ReturnType<PhotoCache['getSnapshot']>;
    boardProfile: Edition['boardProfile'];
};

export const usePhotoGestures = ({
    session,
    editKey,
    targetKey,
    part,
    photos,
    boardProfile,
}: PhotoGesturesInput) => {
    const t = useTranslation();
    const [measured, setMeasured] = useState<Size | null>(null);
    const [announcement, setAnnouncement] = useState('');
    const shownPhoto = part?.photo;
    const info =
        shownPhoto === undefined ? undefined : photos.get(shownPhoto.photoId);
    // A deed that borrows the photo of its space starts from the crop of its own frame (B177); moving it there makes
    // that crop the deed's own.
    const photo =
        shownPhoto?.borrowed === true
            ? deedCrop(shownPhoto, info, part?.photoStyle)
            : shownPhoto;
    const frame = measured === null ? null : { w: measured.w, h: measured.h };
    const context: PlacementContext | null =
        info !== undefined && frame !== null
            ? {
                  source: { w: info.width, h: info.height },
                  frame,
                  bleed: photoBleed(editKey, part?.photoStyle),
              }
            : null;

    const act = (action: PlacementAction, text?: string): void => {
        if (photo === undefined || context === null) {
            return;
        }
        editElement(
            session,
            editKey,
            { photo: actOnPlacement(photo, context, action) },
            `photo:${editKey}`,
        );
        if (text !== undefined) {
            setAnnouncement(text);
        }
    };

    const zoomText = (scale: number): string =>
        t('editor.zoom_announce', { percent: Math.round(scale * 100) });

    // The frame is read after every render, not only when the preview mounts: switching to Hele vak or another
    // board size changes the frame without a new preview, and the size line kept the old one (B251, Ingrid, Kees).
    const frameRef = useRef<HTMLDivElement | null>(null);
    useLayoutEffect(() => {
        const node = frameRef.current;

        if (node === null) {
            return;
        }
        const next = readProbe(node).frame;
        setMeasured((previous) => (sameSize(previous, next) ? previous : next));
    }, [targetKey, photo, info, part?.photoStyle, boardProfile]);

    const gestures =
        photo !== undefined && context !== null
            ? {
                  label: t('editor.photo_frame_label'),
                  hint: t('editor.photo_drag_hint'),
                  announcement,
                  ...photoMoves(photo, act, t, zoomText),
              }
            : undefined;

    return { photo, info, context, act, zoomText, frameRef, gestures };
};
