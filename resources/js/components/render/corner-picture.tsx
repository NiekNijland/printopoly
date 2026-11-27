import { splitBalanced } from '@/lib/render/corner-layout';
import type { PhotoSource } from '@/lib/render/photo';
import type { Layout } from '@/lib/render/themes';

import { useBoardLook } from './board-look';
import { CapArt, CarArt } from './corner-art';
import type { CornerContentProps } from './corner-content';
import { DiagonalStack, edgeMargin, type Band } from './corner-diagonal';
import { FitText } from './fit-text';
import { PhotoSlot } from './photo-slot';
import { Frame, useRender } from './sheet';
import { SpaceIconArt, type SpaceIconSource } from './space-icon';

/** Free Parking and Go to Jail: the name in two lines around a picture, all on the diagonal. */
export const PictureCorner = ({
    space,
    size: c,
    name,
    text,
    layout,
    photo,
    icon,
}: CornerContentProps) => {
    const { theme } = useRender();
    const look = useBoardLook();
    const m = edgeMargin(c);
    const [first, second] = splitBalanced(name);
    const lineText = text?.trim() ?? '';
    const nameBand = (line: string, slot: string): Band => ({
        height: c * 0.15,
        draw: (box) => (
            <FitText
                text={line}
                {...box}
                maxFontMm={c * 0.115}
                minFontMm={2.6}
                wrap="words"
                {...look.name}
                align="center"
                lineHeight={1}
                slot={slot}
            />
        ),
    });
    const bands: Band[] = [nameBand(first, 'name')];

    bands.push(
        pictureBand(
            c * (second === '' ? 0.36 : 0.3),
            layout,
            photo,
            icon,
            space.corner === 'parking' ? 'car' : 'cap',
            theme.ink,
        ),
    );

    if (second !== '') {
        bands.push(nameBand(second, 'name-2'));
    }

    if (lineText !== '') {
        bands.push({
            height: c * 0.09,
            draw: (box) => (
                <FitText
                    text={lineText}
                    {...box}
                    maxFontMm={c * 0.045}
                    minFontMm={2}
                    wrap="words"
                    {...look.figure}
                    align="center"
                    slot="text"
                />
            ),
        });
    }

    return (
        <DiagonalStack
            bounds={{
                left: c * 0.05,
                top: c * 0.05,
                right: c - m,
                bottom: c - m,
            }}
            bands={bands}
            gap={c * 0.02}
            shift={lineText === '' ? 0 : c * 0.03}
            inset={c * 0.02}
        />
    );
};

/** The picture in the middle of a corner: the photo, the chosen icon, or our own drawing. */
export const pictureBand = (
    height: number,
    layout: Layout,
    photo: PhotoSource | undefined,
    icon: SpaceIconSource | undefined,
    drawing: 'car' | 'cap' | null,
    ink: string,
): Band => {
    if (layout === 'framed') {
        return {
            height,
            maxWidth: height * 1.5,
            draw: (box) => <PhotoInCorner {...box} photo={photo} />,
        };
    }

    return {
        height,
        draw: (box) =>
            icon !== undefined || drawing === null ? (
                <SpaceIconArt
                    icon={icon}
                    fallback={null}
                    x={-box.h / 2}
                    y={box.y}
                    size={box.h}
                    color={ink}
                    strokeWidth={1.6}
                />
            ) : drawing === 'car' ? (
                <CarArt x={-box.h * 0.8} y={box.y} w={box.h * 1.6} h={box.h} />
            ) : (
                <CapArt x={-box.h * 0.7} y={box.y} w={box.h * 1.4} h={box.h} />
            ),
    };
};

const PhotoInCorner = ({
    x,
    y,
    w,
    h,
    photo,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    photo?: PhotoSource;
}) => {
    const { theme } = useRender();

    return (
        <>
            <PhotoSlot x={x} y={y} w={w} h={h} photo={photo} />
            <Frame
                x={x}
                y={y}
                w={w}
                h={h}
                color={theme.ink}
                strokeMm={theme.frameMm}
            />
        </>
    );
};
