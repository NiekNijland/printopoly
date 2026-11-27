import type { FreeLayer } from '@/lib/render/edition-types';
import {
    moveLayer,
    rotateLayer,
    scaleLayer,
    type LayerArea,
} from '@/lib/render/editor-layers';

export type Drag =
    | { mode: 'move'; x: number; y: number }
    | {
          mode: 'scale';
          cx: number;
          cy: number;
          distance: number;
          layer: FreeLayer;
      }
    | { mode: 'rotate'; cx: number; cy: number };

const centreOf = (node: HTMLElement) => {
    const rect = node.getBoundingClientRect();

    return {
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
    };
};

export const startDrag = (
    layer: FreeLayer,
    mode: 'move' | 'scale' | 'rotate',
    box: HTMLElement,
    clientX: number,
    clientY: number,
): Drag => {
    if (mode === 'move') {
        return { mode, x: clientX, y: clientY };
    }
    const { cx, cy } = centreOf(box);

    return mode === 'scale'
        ? {
              mode,
              cx,
              cy,
              layer,
              distance: Math.max(1, Math.hypot(clientX - cx, clientY - cy)),
          }
        : { mode, cx, cy };
};

export const dragged = (
    current: Drag,
    layer: FreeLayer,
    event: { clientX: number; clientY: number },
    pxPerMm: number,
    area: LayerArea,
): FreeLayer => {
    if (current.mode === 'move') {
        return moveLayer(
            layer,
            (event.clientX - current.x) / pxPerMm,
            (event.clientY - current.y) / pxPerMm,
            area,
        );
    }
    if (current.mode === 'scale') {
        const distance = Math.hypot(
            event.clientX - current.cx,
            event.clientY - current.cy,
        );

        return scaleLayer(current.layer, distance / current.distance, area);
    }
    const angle =
        (Math.atan2(event.clientY - current.cy, event.clientX - current.cx) *
            180) /
            Math.PI +
        90;

    return rotateLayer(layer, angle);
};

export const keyed = (
    layer: FreeLayer,
    event: { key: string; shiftKey: boolean },
    area: LayerArea,
): FreeLayer | 'remove' | undefined => {
    const step = event.shiftKey ? 5 : 1;
    const arrows: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
    };
    const arrow = arrows[event.key];
    if (arrow !== undefined) {
        return moveLayer(layer, arrow[0], arrow[1], area);
    }
    if (event.key === '+' || event.key === '=') {
        return scaleLayer(layer, 1.1, area);
    }
    if (event.key === '-' || event.key === '_') {
        return scaleLayer(layer, 1 / 1.1, area);
    }
    if (event.key === '[' || event.key === ']') {
        return rotateLayer(
            layer,
            (layer.rotation ?? 0) + (event.key === ']' ? 5 : -5),
        );
    }

    return event.key === 'Delete' || event.key === 'Backspace'
        ? 'remove'
        : undefined;
};
