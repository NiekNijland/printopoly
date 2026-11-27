import type { ReactNode } from 'react';

import { lidLayout, type LidPhoto } from '@/lib/render/box-lid-layout';
import type { BoxLidStyle } from '@/lib/render/edition-part-styles';
import type { TitleStyle } from '@/lib/render/edition-types';
import type { PhotoSource } from '@/lib/render/photo';
import {
    DEFAULT_BOARD_PROFILE,
    type BoardProfile,
} from '@/lib/render/print-board';
import { partStyleOf } from '@/lib/render/style';
import { THEMES } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';
import type { Rect } from '@/types/print';

import type { BoardProps } from './board';
import { FullPhotoLid } from './box-lid-full';
import { LidBackground, LidFrame, PhotoMat } from './box-lid-look';
import { ModernBand, OffsetBlock } from './box-lid-look-modern';
import { PictureLid } from './box-lid-picture';
import { LidTitleText, lidWords } from './box-lid-text';
import { FreeLayers, type RenderLayer } from './free-layers';
import { PhotoSlot, isFullPhoto } from './photo-slot';
import { Abs, Sheet, useRender, type ElementProps } from './sheet';

export type BoxLidProps = {
    editionName: string;
    /** Line under the name: the number of players when absent, none when empty (B169). */
    subtitle?: string;
    /** Own lines under the subtitle, such as "Kerst 2026 · familie De Vries" (B169). */
    lines?: string;
    profile?: BoardProfile;
    photo?: PhotoSource;
    /** Where the title sits on a photo over the whole lid, -1 (top) to 1 (bottom) (B170). */
    titleOffset?: number;
    /** `false` takes the light band from under the title on a photo over the whole lid (B170). */
    titleBand?: boolean;
    /** The look of the name plate on a lid that shows the board (Niek, 22 nov); the plate of the theme when absent. */
    titleStyle?: TitleStyle;
    /** Free text and photo layers in mm from the top left of the lid. */
    layers?: readonly RenderLayer[];
    /**
     * The real board of the edition (`boardPropsOf`), the picture of a lid without an own photo (B256). Without it
     * the picture is the standard board with the edition name.
     */
    board?: BoardProps;
    /**
     * The photo is the logo of the board centre (B241): it goes whole and straight in the place of the board
     * picture, between the name plate and the street colours (B256).
     */
    logo?: boolean;
    /**
     * `false` leaves the board picture out: the small tile of the lid style in the editor shows the frame and the
     * name plate only, so it does not draw a whole board four times (B271).
     */
    boardPicture?: boolean;
} & ElementProps;

/** The sticker for the box lid, sized by the board profile (B57). */
export const BoxLid = ({
    editionName,
    subtitle,
    lines,
    profile = DEFAULT_BOARD_PROFILE,
    photo,
    titleOffset,
    titleBand,
    titleStyle,
    layers,
    board,
    logo = false,
    boardPicture = true,
    ...element
}: BoxLidProps) => {
    const { w, h } = profile.boxLid;
    const theme = THEMES[element.theme];
    return (
        <Sheet
            {...element}
            element="box-lid"
            widthMm={w}
            heightMm={h}
            background={theme.boardBackground}
        >
            <LidFace
                w={w}
                h={h}
                editionName={editionName}
                subtitle={subtitle}
                lines={lines}
                photo={photo}
                titleOffset={titleOffset}
                titleBand={titleBand}
                titleStyle={titleStyle}
                bleed={element.bleedMm ?? 0}
                board={board}
                profile={profile}
                logo={logo}
                boardPicture={boardPicture}
            />
            {layers !== undefined && <FreeLayers layers={layers} />}
        </Sheet>
    );
};

const LidFace = ({
    w,
    h,
    editionName,
    subtitle,
    lines,
    photo,
    titleOffset,
    titleBand = true,
    titleStyle,
    bleed,
    board,
    profile,
    logo,
    boardPicture,
}: {
    w: number;
    h: number;
    editionName: string;
    subtitle?: string;
    lines?: string;
    photo?: PhotoSource;
    titleOffset?: number;
    titleBand?: boolean;
    titleStyle?: TitleStyle;
    bleed: number;
    board?: BoardProps;
    profile: BoardProfile;
    logo: boolean;
    boardPicture: boolean;
}) => {
    const { locale, style } = useRender();
    // The style of the lid (B271): its frame, background and decoration; the name plate keeps its title style.
    const look = partStyleOf(style, 'boxLid');
    const words = lidWords(h, subtitle, lines, locale);
    const mode: LidPhoto =
        photo === undefined
            ? 'none'
            : logo
              ? 'logo'
              : isFullPhoto(photo)
                ? 'full'
                : 'framed';
    const layout = lidLayout(
        { w, h },
        {
            photo: mode,
            offset: titleOffset,
            subtitle: words.line.trim() !== '',
            lines: words.own !== '',
        },
    );
    const onPhoto = mode === 'full' && !titleBand;
    const text = (
        <LidTitleText
            editionName={editionName}
            layout={layout}
            look={look}
            mode={mode}
            ink={onPhoto ? '#FFFFFF' : undefined}
            words={words}
        />
    );

    // "Full": the photo covers the whole lid, bleed included; the text sits on a light band, or on a soft dark
    // fade when the band is off (B124, B170).
    if (mode === 'full' && layout.block !== undefined) {
        return (
            <FullPhotoLid
                w={w}
                h={h}
                bleed={bleed}
                photo={photo}
                look={look}
                block={layout.block}
                onPhoto={onPhoto}
                text={text}
            />
        );
    }

    if (layout.picture !== undefined) {
        return (
            <PictureLid
                w={w}
                h={h}
                bleed={bleed}
                look={look}
                picture={layout.picture}
                layout={layout}
                words={words}
                editionName={editionName}
                titleStyle={titleStyle}
                mode={mode}
                photo={photo}
                board={board}
                profile={profile}
                boardPicture={boardPicture}
            />
        );
    }

    return (
        <PhotoLid
            w={w}
            h={h}
            bleed={bleed}
            look={look}
            rect={layout.photo}
            photo={photo}
            text={text}
        />
    );
};

const PhotoLid = ({
    w,
    h,
    bleed,
    look,
    rect,
    photo,
    text,
}: {
    w: number;
    h: number;
    bleed: number;
    look: BoxLidStyle | undefined;
    rect: Rect | undefined;
    photo?: PhotoSource;
    text: ReactNode;
}) => {
    return (
        <>
            <LidBackground look={look} w={w} h={h} bleed={bleed} />
            <LidFrame look={look} w={w} h={h} bleed={bleed} />
            {look === 'modern' && (
                <ModernBand y={h - 9} w={w} h={h} bleed={bleed} />
            )}
            {rect !== undefined && (
                <>
                    {look === 'modern' && <OffsetBlock rect={rect} />}
                    {look === 'playful' ? (
                        /* Speels: the photo with round corners; the frame it is cropped to stays the same. */
                        <Abs
                            {...rect}
                            style={{ borderRadius: mm(6), overflow: 'hidden' }}
                        >
                            <PhotoSlot
                                x={0}
                                y={0}
                                w={rect.w}
                                h={rect.h}
                                photo={photo}
                            />
                        </Abs>
                    ) : (
                        <PhotoSlot {...rect} photo={photo} />
                    )}
                    <PhotoMat look={look} rect={rect} />
                </>
            )}
            {text}
        </>
    );
};
