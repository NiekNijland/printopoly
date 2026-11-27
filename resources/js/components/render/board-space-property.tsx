import type { PhotoSource } from '@/lib/render/photo';
import type { Layout } from '@/lib/render/themes';
import type { OwnableSpace } from '@/types/game';

import { useBoardLook } from './board-look';
import { FullSpace } from './board-space-full';
import { PriceLine, groupColor, StreetBand } from './board-space-parts';
import type { StyledPropertyProps } from './board-space-styles';
import { ModernProperty } from './board-space-styles-modern';
import { PlayfulProperty } from './board-space-styles-playful';
import { VintageProperty } from './board-space-styles-vintage';
import { FitText } from './fit-text';
import type { IconName } from './icons';
import { PhotoSlot } from './photo-slot';
import { useRender } from './sheet';
import { SpaceIconArt, type SpaceIconSource } from './space-icon';

/** A street, station or utility with a framed photo or none. */
const StyledProperty = (props: StyledPropertyProps) => {
    switch (props.style) {
        case 'vintage':
            return <VintageProperty {...props} />;
        case 'modern':
            return <ModernProperty {...props} />;
        case 'playful':
            return <PlayfulProperty {...props} />;
    }
};

type PropertyContentProps = {
    space: OwnableSpace;
    bleed: number;
    w: number;
    h: number;
    title: string;
    town?: string;
    layout: Layout;
    full: boolean;
    photo?: PhotoSource;
    chosenIcon?: SpaceIconSource;
};

export const PropertyContent = ({
    space,
    bleed,
    w,
    h,
    title,
    town,
    layout,
    full,
    photo,
    chosenIcon,
}: PropertyContentProps) => {
    const { theme, money, style } = useRender();
    const look = useBoardLook();
    const bar = space.type === 'street' ? h * 0.2 : 0;
    const townText = space.type === 'street' ? town?.trim() : undefined;
    const framed = layout === 'framed';
    const price = money(space.price);
    const icon =
        space.type === 'station'
            ? 'train'
            : space.position === 12
              ? 'bulb'
              : 'tap';

    if (look.style !== undefined && !full) {
        return (
            <StyledProperty
                style={look.style}
                w={w}
                h={h}
                street={space.type === 'street'}
                title={title}
                town={townText}
                price={price}
                color={
                    space.type === 'street'
                        ? (style?.groupColors?.[space.group] ??
                          groupColor(space.group, theme))
                        : theme.ink
                }
                photo={framed ? photo : undefined}
                icon={chosenIcon}
                fallbackIcon={icon}
            />
        );
    }

    if (full) {
        return (
            <FullSpace
                space={space}
                bleed={bleed}
                w={w}
                h={h}
                bar={bar}
                title={title}
                town={townText}
                price={price}
                photo={photo}
            />
        );
    }

    return (
        <ClassicProperty
            space={space}
            bleed={bleed}
            w={w}
            h={h}
            bar={bar}
            title={title}
            town={townText}
            price={price}
            framed={framed}
            photo={photo}
            chosenIcon={chosenIcon}
            icon={icon}
        />
    );
};

type ClassicPropertyProps = {
    space: OwnableSpace;
    bleed: number;
    w: number;
    h: number;
    bar: number;
    title: string;
    town?: string;
    price: string;
    framed: boolean;
    photo?: PhotoSource;
    chosenIcon?: SpaceIconSource;
    icon: IconName;
};

const ClassicProperty = ({
    space,
    bleed,
    w,
    h,
    bar,
    title,
    town,
    price,
    framed,
    photo,
    chosenIcon,
    icon,
}: ClassicPropertyProps) => {
    const { theme } = useRender();
    const caps = useBoardLook().name.caps;
    // The name sits right under the band, as on the classic board; with a photo it takes two lines at
    // most, so the photo is as large as the space allows (UX 4, ronde 4).
    const nameTop = bar + (framed ? 2 : bar > 0 ? 2.4 : 3.2);
    const nameHeight = framed ? 10 : h * (bar > 0 ? 0.36 : 0.22);
    const priceTop = h - (framed ? 7.5 : 8.2);
    const mediaTop = nameTop + nameHeight + (framed ? 0.5 : 1);
    const mediaHeight = priceTop - (framed ? 0.5 : 1.5) - mediaTop;
    const iconSize = Math.min(w - 12, mediaHeight, 24);

    return (
        <>
            <StreetBand
                space={space}
                bleed={bleed}
                w={w}
                bar={bar}
                town={town}
            />
            <FitText
                text={title}
                x={2}
                y={nameTop}
                w={w - 4}
                h={nameHeight}
                maxFontMm={framed ? 3.6 : 4.4}
                minFontMm={2}
                wrap="words"
                font="heading"
                caps={caps}
                lineHeight={1.05}
                align="center"
                valign={framed ? 'middle' : 'top'}
                slot="name"
            />
            {framed && (
                <PhotoSlot
                    x={1.5}
                    y={mediaTop}
                    w={w - 3}
                    h={mediaHeight}
                    photo={photo}
                />
            )}
            {space.type !== 'street' && !framed && (
                <SpaceIconArt
                    icon={chosenIcon}
                    fallback={icon}
                    x={(w - iconSize) / 2}
                    y={mediaTop + (mediaHeight - iconSize) / 2}
                    size={iconSize}
                    color={theme.ink}
                    strokeWidth={1.5}
                />
            )}
            <PriceLine w={w} top={priceTop} text={price} rule={!framed} />
        </>
    );
};
