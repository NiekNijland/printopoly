import type { ReactNode } from 'react';

import {
    useFrameGestures,
    type StageGestures,
} from '@/features/edition/editor/use-frame-gestures';
import { mm } from '@/lib/render/units';

const PX_PER_MM = 96 / 25.4;

type StageFrameProps = {
    gestures: StageGestures | undefined;
    used: () => void;
    scale: number;
    zoom: number;
    widthMm: number;
    heightMm: number;
    bleedMm: number;
    overlay: ((info: { pxPerMm: number }) => ReactNode) | undefined;
    children: ReactNode;
};

export const StageFrame = ({
    gestures,
    used,
    scale,
    zoom,
    widthMm,
    heightMm,
    bleedMm,
    overlay,
    children,
}: StageFrameProps) => {
    const {
        setFrame,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel,
        onKeyDown,
    } = useFrameGestures(gestures, PX_PER_MM * scale * zoom, used);

    return (
        <div
            ref={setFrame}
            data-stage-frame=""
            role={gestures === undefined ? undefined : 'group'}
            aria-label={gestures?.label}
            tabIndex={gestures === undefined ? undefined : 0}
            data-focus-view={gestures === undefined ? undefined : ''}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onKeyDown={onKeyDown}
            className={
                gestures === undefined
                    ? 'relative shrink-0 shadow-paper'
                    : 'relative shrink-0 cursor-grab touch-none shadow-paper active:cursor-grabbing'
            }
            style={{
                width: widthMm * PX_PER_MM * scale,
                height: heightMm * PX_PER_MM * scale,
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    width: mm(widthMm + 2 * bleedMm),
                    height: mm(heightMm + 2 * bleedMm),
                    transform: `translate(${-bleedMm * PX_PER_MM * scale}px, ${-bleedMm * PX_PER_MM * scale}px) scale(${scale})`,
                    transformOrigin: '0 0',
                }}
            >
                {children}
                {overlay !== undefined && (
                    <div
                        style={{
                            position: 'absolute',
                            left: mm(bleedMm),
                            top: mm(bleedMm),
                            width: mm(widthMm),
                            height: mm(heightMm),
                        }}
                    >
                        {overlay({
                            pxPerMm: PX_PER_MM * scale * zoom,
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
