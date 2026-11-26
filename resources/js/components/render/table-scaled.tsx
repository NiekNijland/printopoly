import type { CSSProperties, ReactNode } from 'react';

import { mm } from '@/lib/render/units';

/** CSS pixels per millimetre. The renderers draw in mm at true size. */
const PX_PER_MM = 96 / 25.4;

interface ScaledProps {
    /** True size of the drawn element in mm. */
    widthMm: number;
    heightMm: number;
    /** Width on the page in px. */
    width: number;
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
}

/**
 * A renderer element shrunk to a width in px. The box has its final size from the first
 * render on, so server and browser agree (no measuring).
 */
export const Scaled = ({
    widthMm,
    heightMm,
    width,
    children,
    className,
    style,
}: ScaledProps) => {
    const scale = width / (widthMm * PX_PER_MM);

    return (
        <div
            aria-hidden="true"
            className={className}
            style={{
                position: 'relative',
                width,
                height: heightMm * PX_PER_MM * scale,
                flexShrink: 0,
                ...style,
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: mm(widthMm),
                    height: mm(heightMm),
                    transformOrigin: '0 0',
                    transform: `scale(${scale})`,
                }}
            >
                {children}
            </div>
        </div>
    );
};
