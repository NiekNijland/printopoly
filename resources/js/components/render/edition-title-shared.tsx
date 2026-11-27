import type { ReactNode } from 'react';

import type { EditionTitleProps, NameFont, PlateLook } from './edition-title';
import { Abs, useRender } from './sheet';

export type TitleProps = EditionTitleProps & {
    withPhoto: boolean;
    look: PlateLook;
    font: NameFont;
    mark: string;
    photoOnTitle: (top: number, tilt: number) => ReactNode;
};

/** The size of a photo of the given shape that fits a box, without cropping it. */
export const scaleToFit = (
    aspect: number,
    maxW: number,
    maxH: number,
): { w: number; h: number } => {
    const h = Math.min(maxH, maxW / aspect);

    return { w: h * aspect, h };
};

export const turnedAspect = (aspect: number, rotation: number): number => {
    return Math.round(rotation / 90) % 2 === 0 ? aspect : 1 / aspect;
};

/** The name as drawn: in capitals for a style that sets it so, in the language of the edition. */
export const useShownName = (name: string, upper: boolean): string => {
    const { locale } = useRender();

    return upper ? name.toLocaleUpperCase(locale) : name;
};

/** The tagline, or `null` when there is none. */
export const taglineOf = (tagline: string | undefined): string | null => {
    return tagline === undefined || tagline.trim() === '' ? null : tagline;
};

export const TiltedPlate = ({
    layout,
    titleStyle,
    children,
}: {
    layout: {
        plateX: number;
        plateY: number;
        plateW: number;
        plateH: number;
        tilt: number;
    };
    titleStyle: string;
    children: ReactNode;
}) => {
    return (
        <Abs
            x={layout.plateX}
            y={layout.plateY}
            w={layout.plateW}
            h={layout.plateH}
            style={{
                transform: `rotate(${layout.tilt}deg)`,
                transformOrigin: 'center',
            }}
            slot="edition-plate"
            data-title-style={titleStyle}
        >
            {children}
        </Abs>
    );
};
