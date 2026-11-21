import { useRef, type KeyboardEvent, type PointerEvent } from 'react';

import { useTranslation } from '@/hooks/use-translation';
import type { FreeLayer } from '@/lib/edition/types';
import {
    moveLayer,
    rotateLayer,
    scaleLayer,
    type LayerArea,
    type Zone,
} from '@/lib/editor/layers';
import { mm } from '@/lib/render/units';

/**
 * Red stripes over the places that must stay free (fold lines, card spots). Strong enough to read as red on
 * every board colour: at a lighter tint they looked beige on the green board (bug 34, ronde 3).
 */
const HATCH =
    'repeating-linear-gradient(45deg, rgba(200,50,31,0.5) 0 4px, rgba(200,50,31,0.08) 4px 8px)';

interface LayerOverlayProps {
    layers: readonly FreeLayer[];
    area: LayerArea;
    /** Screen pixels per mm of the stage, to turn pointer movement into mm. */
    pxPerMm: number;
    selectedId: string | null;
    zones?: readonly Zone[];
    onSelect: (id: string) => void;
    /** `group` joins the steps of one drag into one undo step. */
    onChange: (layer: FreeLayer, group: string) => void;
    onRemove: (id: string) => void;
}

type Drag =
    | { mode: 'move'; x: number; y: number }
    | {
          mode: 'scale';
          cx: number;
          cy: number;
          distance: number;
          layer: FreeLayer;
      }
    | { mode: 'rotate'; cx: number; cy: number };

/**
 * Grab handles over the layers of an element. A layer moves by dragging, scales with the corner
 * handle and turns with the handle above it. With the keyboard: arrows move, plus and minus scale,
 * the square brackets turn, Delete removes (B93).
 */
export function LayerOverlay({
    layers,
    area,
    pxPerMm,
    selectedId,
    zones = [],
    onSelect,
    onChange,
    onRemove,
}: LayerOverlayProps) {
    const t = useTranslation();
    const drag = useRef<Drag | null>(null);
    const group = (layer: FreeLayer) => `layer:${layer.id}`;

    const centreOf = (node: HTMLElement) => {
        const rect = node.getBoundingClientRect();

        return {
            cx: rect.left + rect.width / 2,
            cy: rect.top + rect.height / 2,
        };
    };

    const begin =
        (layer: FreeLayer, mode: 'move' | 'scale' | 'rotate') =>
        (event: PointerEvent<HTMLElement>) => {
            event.stopPropagation();
            onSelect(layer.id);
            const box =
                event.currentTarget.closest<HTMLElement>('[data-layer-box]');
            if (box === null) {
                return;
            }
            event.currentTarget.setPointerCapture?.(event.pointerId);
            if (mode === 'move') {
                drag.current = { mode, x: event.clientX, y: event.clientY };

                return;
            }
            const { cx, cy } = centreOf(box);
            drag.current =
                mode === 'scale'
                    ? {
                          mode,
                          cx,
                          cy,
                          layer,
                          distance: Math.max(
                              1,
                              Math.hypot(
                                  event.clientX - cx,
                                  event.clientY - cy,
                              ),
                          ),
                      }
                    : { mode, cx, cy };
        };

    const move = (layer: FreeLayer) => (event: PointerEvent<HTMLElement>) => {
        const current = drag.current;
        if (current === null) {
            return;
        }
        if (current.mode === 'move') {
            onChange(
                moveLayer(
                    layer,
                    (event.clientX - current.x) / pxPerMm,
                    (event.clientY - current.y) / pxPerMm,
                    area,
                ),
                group(layer),
            );
            drag.current = { mode: 'move', x: event.clientX, y: event.clientY };
        } else if (current.mode === 'scale') {
            const distance = Math.hypot(
                event.clientX - current.cx,
                event.clientY - current.cy,
            );
            onChange(
                scaleLayer(current.layer, distance / current.distance, area),
                group(layer),
            );
        } else {
            const angle =
                (Math.atan2(
                    event.clientY - current.cy,
                    event.clientX - current.cx,
                ) *
                    180) /
                    Math.PI +
                90;
            onChange(rotateLayer(layer, angle), group(layer));
        }
    };

    const end = () => {
        drag.current = null;
    };

    const keys = (layer: FreeLayer) => (event: KeyboardEvent<HTMLElement>) => {
        const step = event.shiftKey ? 5 : 1;
        const arrows: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
        };
        const arrow = arrows[event.key];
        if (arrow !== undefined) {
            event.preventDefault();
            onChange(moveLayer(layer, arrow[0], arrow[1], area), group(layer));
        } else if (event.key === '+' || event.key === '=') {
            event.preventDefault();
            onChange(scaleLayer(layer, 1.1, area), group(layer));
        } else if (event.key === '-' || event.key === '_') {
            event.preventDefault();
            onChange(scaleLayer(layer, 1 / 1.1, area), group(layer));
        } else if (event.key === '[' || event.key === ']') {
            event.preventDefault();
            onChange(
                rotateLayer(
                    layer,
                    (layer.rotation ?? 0) + (event.key === ']' ? 5 : -5),
                ),
                group(layer),
            );
        } else if (event.key === 'Delete' || event.key === 'Backspace') {
            event.preventDefault();
            onRemove(layer.id);
        }
    };

    const handleSize = 14 / pxPerMm;

    return (
        <div
            aria-hidden={layers.length === 0 && zones.length === 0}
            style={{ position: 'absolute', inset: 0 }}
            data-testid="layer-overlay"
        >
            {zones.map((zone, index) => (
                <div
                    key={index}
                    aria-hidden="true"
                    style={{
                        position: 'absolute',
                        left: mm(zone.x),
                        top: mm(zone.y),
                        width: mm(zone.w),
                        height: mm(zone.h),
                        background: HATCH,
                        pointerEvents: 'none',
                        outline: `${2 / pxPerMm}px ${zone.kind === 'spot' ? 'solid' : 'dashed'} #C8321F`,
                        transform:
                            zone.rotation === 0
                                ? undefined
                                : `rotate(${zone.rotation}deg)`,
                    }}
                />
            ))}
            {layers.map((layer) => {
                const selected = layer.id === selectedId;

                return (
                    <div
                        key={layer.id}
                        data-layer-box={layer.id}
                        style={{
                            position: 'absolute',
                            left: mm(layer.x),
                            top: mm(layer.y),
                            width: mm(layer.w),
                            height: mm(layer.h),
                            transform:
                                layer.rotation === undefined
                                    ? undefined
                                    : `rotate(${layer.rotation}deg)`,
                        }}
                    >
                        <div
                            role="button"
                            tabIndex={0}
                            aria-label={
                                layer.kind === 'text'
                                    ? t('editor.layer_text_named', {
                                          text: layer.text,
                                      })
                                    : t('editor.layer_photo')
                            }
                            aria-pressed={selected}
                            onPointerDown={begin(layer, 'move')}
                            onPointerMove={move(layer)}
                            onPointerUp={end}
                            onPointerCancel={end}
                            onFocus={() => onSelect(layer.id)}
                            onKeyDown={keys(layer)}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                cursor: 'move',
                                touchAction: 'none',
                                outline: selected
                                    ? `${2 / pxPerMm}px solid #C8321F`
                                    : `${1 / pxPerMm}px solid rgba(27,31,36,0.25)`,
                            }}
                        />
                        {selected && (
                            <>
                                <div
                                    aria-hidden="true"
                                    onPointerDown={begin(layer, 'scale')}
                                    onPointerMove={move(layer)}
                                    onPointerUp={end}
                                    onPointerCancel={end}
                                    style={{
                                        position: 'absolute',
                                        right: mm(-handleSize / 2),
                                        bottom: mm(-handleSize / 2),
                                        width: mm(handleSize),
                                        height: mm(handleSize),
                                        background: '#FFFDF7',
                                        border: `${2 / pxPerMm}px solid #C8321F`,
                                        cursor: 'nwse-resize',
                                        touchAction: 'none',
                                    }}
                                />
                                <div
                                    aria-hidden="true"
                                    onPointerDown={begin(layer, 'rotate')}
                                    onPointerMove={move(layer)}
                                    onPointerUp={end}
                                    onPointerCancel={end}
                                    style={{
                                        position: 'absolute',
                                        left: '50%',
                                        top: mm(-handleSize * 1.8),
                                        marginLeft: mm(-handleSize / 2),
                                        width: mm(handleSize),
                                        height: mm(handleSize),
                                        borderRadius: '50%',
                                        background: '#FFFDF7',
                                        border: `${2 / pxPerMm}px solid #C8321F`,
                                        cursor: 'grab',
                                        touchAction: 'none',
                                    }}
                                />
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
