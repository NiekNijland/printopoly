import { useRef, type KeyboardEvent, type PointerEvent } from 'react';

import {
    dragged,
    keyed,
    startDrag,
    type Drag,
} from '@/features/edition/editor/layer-gestures';
import { useTranslation } from '@/hooks/use-translation';
import type { FreeLayer } from '@/lib/render/edition-types';
import type { LayerArea, Zone } from '@/lib/render/editor-layers';
import { mm } from '@/lib/render/units';

/**
 * Red stripes over the places that must stay free (fold lines, card spots). Strong enough to read as red on
 * every board colour: at a lighter tint they looked beige on the green board (bug 34, ronde 3).
 */
const HATCH =
    'repeating-linear-gradient(45deg, rgba(200,50,31,0.5) 0 4px, rgba(200,50,31,0.08) 4px 8px)';

type LayerOverlayProps = {
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
};

type LayerHandlers = {
    begin: (
        layer: FreeLayer,
        mode: 'move' | 'scale' | 'rotate',
    ) => (event: PointerEvent<HTMLElement>) => void;
    move: (layer: FreeLayer) => (event: PointerEvent<HTMLElement>) => void;
    end: () => void;
    keys: (layer: FreeLayer) => (event: KeyboardEvent<HTMLElement>) => void;
};

const useLayerHandlers = ({
    area,
    pxPerMm,
    onSelect,
    onChange,
    onRemove,
}: Pick<
    LayerOverlayProps,
    'area' | 'pxPerMm' | 'onSelect' | 'onChange' | 'onRemove'
>): LayerHandlers => {
    const drag = useRef<Drag | null>(null);
    const group = (layer: FreeLayer) => `layer:${layer.id}`;

    return {
        begin: (layer, mode) => (event) => {
            event.stopPropagation();
            onSelect(layer.id);
            const box =
                event.currentTarget.closest<HTMLElement>('[data-layer-box]');
            if (box === null) {
                return;
            }
            if ('setPointerCapture' in event.currentTarget) {
                event.currentTarget.setPointerCapture(event.pointerId);
            }
            drag.current = startDrag(
                layer,
                mode,
                box,
                event.clientX,
                event.clientY,
            );
        },
        move: (layer) => (event) => {
            const current = drag.current;
            if (current === null) {
                return;
            }
            onChange(
                dragged(current, layer, event, pxPerMm, area),
                group(layer),
            );
            if (current.mode === 'move') {
                drag.current = {
                    mode: 'move',
                    x: event.clientX,
                    y: event.clientY,
                };
            }
        },
        end: () => {
            drag.current = null;
        },
        keys: (layer) => (event) => {
            const next = keyed(layer, event, area);
            if (next === undefined) {
                return;
            }
            event.preventDefault();
            if (next === 'remove') {
                onRemove(layer.id);
            } else {
                onChange(next, group(layer));
            }
        },
    };
};

const ZoneMarks = ({
    zones,
    pxPerMm,
}: {
    zones: readonly Zone[];
    pxPerMm: number;
}) =>
    zones.map((zone, index) => (
        <div
            key={index}
            aria-hidden="true"
            style={{
                position: 'absolute',
                left: mm(zone.x),
                top: mm(zone.y),
                width: mm(zone.w),
                height: mm(zone.h),
                // The fixed text of the lid only gets a dashed outline: it is text to keep clear,
                // not a cut (bug 36 of ronde 3).
                background: zone.kind === 'text' ? undefined : HATCH,
                pointerEvents: 'none',
                outline: `${2 / pxPerMm}px ${zone.kind === 'spot' ? 'solid' : 'dashed'} #C8321F`,
                transform:
                    zone.rotation === 0
                        ? undefined
                        : `rotate(${zone.rotation}deg)`,
            }}
        />
    ));

type LayerBoxProps = {
    layer: FreeLayer;
    selected: boolean;
    pxPerMm: number;
    handlers: LayerHandlers;
    onSelect: (id: string) => void;
};

const LayerHandles = ({
    layer,
    pxPerMm,
    handlers: { begin, move, end },
}: Omit<LayerBoxProps, 'selected' | 'onSelect'>) => {
    const handleSize = 14 / pxPerMm;

    return (
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
    );
};

const LayerBox = ({
    layer,
    selected,
    pxPerMm,
    handlers,
    onSelect,
}: LayerBoxProps) => {
    const t = useTranslation();
    const { begin, move, end, keys } = handlers;

    return (
        <div
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
                <LayerHandles
                    layer={layer}
                    pxPerMm={pxPerMm}
                    handlers={handlers}
                />
            )}
        </div>
    );
};

/**
 * Grab handles over the layers of an element. A layer moves by dragging, scales with the corner
 * handle and turns with the handle above it. With the keyboard: arrows move, plus and minus scale,
 * the square brackets turn, Delete removes (B93).
 */
export const LayerOverlay = ({
    layers,
    area,
    pxPerMm,
    selectedId,
    zones = [],
    onSelect,
    onChange,
    onRemove,
}: LayerOverlayProps) => {
    const handlers = useLayerHandlers({
        area,
        pxPerMm,
        onSelect,
        onChange,
        onRemove,
    });

    return (
        <div
            aria-hidden={layers.length === 0 && zones.length === 0}
            style={{ position: 'absolute', inset: 0 }}
            data-testid="layer-overlay"
        >
            <ZoneMarks zones={zones} pxPerMm={pxPerMm} />
            {layers.map((layer) => (
                <LayerBox
                    key={layer.id}
                    layer={layer}
                    selected={layer.id === selectedId}
                    pxPerMm={pxPerMm}
                    handlers={handlers}
                    onSelect={onSelect}
                />
            ))}
        </div>
    );
};
