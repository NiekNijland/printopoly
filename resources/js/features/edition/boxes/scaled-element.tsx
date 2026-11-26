import type { ReactNode } from 'react';

const PX_PER_MM = 96 / 25.4;

type ScaledElementProps = {
    widthMm: number;
    heightMm: number;
    /** The element is shrunk to fit in this box (in px), never enlarged past true size times `enlarge`. */
    maxWidth: number;
    maxHeight: number;
    enlarge?: number;
    children: ReactNode;
};

/**
 * An element drawn at true size in mm, scaled down to a small box. The renderers measure in mm, so a small preview
 * is the same drawing as the big one, only smaller.
 */
export const ScaledElement = ({
    widthMm,
    heightMm,
    maxWidth,
    maxHeight,
    enlarge = 1,
    children,
}: ScaledElementProps) => {
    const width = widthMm * PX_PER_MM;
    const height = heightMm * PX_PER_MM;
    const scale = Math.min(maxWidth / width, maxHeight / height, enlarge);

    return (
        <div
            style={{ width: width * scale, height: height * scale }}
            className="relative overflow-hidden"
        >
            <div
                style={{
                    width,
                    height,
                    transform: `scale(${String(scale)})`,
                    transformOrigin: 'top left',
                }}
            >
                {children}
            </div>
        </div>
    );
};
