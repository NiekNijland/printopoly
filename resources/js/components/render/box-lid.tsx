import { lidLayout, type LidPhoto } from '@/lib/render/box-lid-layout';
import { mix } from '@/lib/render/color';
import type { TitleStyle } from '@/lib/render/edition-types';
import type { PhotoSource } from '@/lib/render/photo';
import {
    DEFAULT_BOARD_PROFILE,
    type BoardProfile,
} from '@/lib/render/print-board';
import { STRINGS } from '@/lib/render/strings';
import { partStyleOf } from '@/lib/render/style';
import { THEMES } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { Board, type BoardProps } from './board';
import {
    FullPhotoFrame,
    LidBackground,
    LidConfetti,
    LidFrame,
    LidStrip,
    ModernBand,
    OffsetBlock,
    PhotoMat,
    TapeCorners,
    bandStyle,
    vintageLid,
} from './box-lid-look';
import { EditionTitle, titleFontOf } from './edition-title';
import { FitText } from './fit-text';
import { FreeLayers, type RenderLayer } from './free-layers';
import {
    BAND_OPACITY,
    LIGHT_TEXT_SHADOW,
    PhotoSlot,
    isFullPhoto,
} from './photo-slot';
import { pieceText } from './piece-styles';
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

/** A dark fade behind light text on a photo without the band: strongest in the middle of the text block. */
const TEXT_FADE =
    'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.5) 30%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0))';

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
    const { theme, locale, currency, words, style } = useRender();
    // The style of the lid (B271): its frame, background and decoration; the name plate keeps its title style.
    const look = partStyleOf(style, 'boxLid');
    const nameText = pieceText(look, 'name');
    const lineText = pieceText(look, 'line');
    const line = subtitle ?? STRINGS[locale].boxLidSubtitle;
    const own = lines?.trim() ?? '';
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
            subtitle: line.trim() !== '',
            lines: own !== '',
        },
    );
    const onPhoto = mode === 'full' && !titleBand;
    const ink = onPhoto ? '#FFFFFF' : undefined;
    // On a lid of 267 mm the subtitle was 5 mm high at most: too small to read on the box (R5-29, Sophie).
    const subtitleFont = Math.min(10, Math.max(5, h * 0.034));
    const linesFont = Math.min(7, Math.max(5, h * 0.024));

    const text = (
        <>
            <FitText
                text={editionName}
                {...layout.title}
                maxFontMm={24 * (look === undefined ? theme.titleScale : 1)}
                minFontMm={6}
                font="title"
                {...nameText}
                align="center"
                color={mode === 'full' ? ink : theme.accent}
                slot="edition-name"
            />
            {layout.subtitle !== undefined && (
                <FitText
                    text={line}
                    {...layout.subtitle}
                    maxFontMm={subtitleFont}
                    minFontMm={3.5}
                    font="body"
                    {...lineText}
                    align="center"
                    color={ink}
                    slot="subtitle"
                />
            )}
            {layout.lines !== undefined && (
                <FitText
                    text={own}
                    {...layout.lines}
                    maxFontMm={linesFont}
                    minFontMm={3}
                    wrap="words"
                    font="body"
                    align="center"
                    lineHeight={1.3}
                    color={ink}
                    slot="lines"
                />
            )}
        </>
    );

    // "Full": the photo covers the whole lid, bleed included; the text sits on a light band, or on a soft dark
    // fade when the band is off (B124, B170).
    if (mode === 'full' && layout.block !== undefined) {
        const band = onPhoto
            ? { inset: 0, style: {} }
            : bandStyle(look, theme, BAND_OPACITY);

        return (
            <>
                <PhotoSlot
                    x={-bleed}
                    y={-bleed}
                    w={w + 2 * bleed}
                    h={h + 2 * bleed}
                    photo={photo}
                />
                <FullPhotoFrame look={look} w={w} h={h} />
                <Abs
                    x={-bleed + band.inset}
                    y={layout.block.y - (onPhoto ? 8 : 0)}
                    w={w + 2 * bleed - 2 * band.inset}
                    h={layout.block.h + (onPhoto ? 16 : 0)}
                    style={onPhoto ? { background: TEXT_FADE } : band.style}
                    slot={onPhoto ? 'text-fade' : 'name-band'}
                />
                {onPhoto ? (
                    <Abs
                        x={0}
                        y={0}
                        w={w}
                        h={h}
                        style={{ textShadow: LIGHT_TEXT_SHADOW }}
                    >
                        {text}
                    </Abs>
                ) : (
                    text
                )}
            </>
        );
    }

    if (layout.picture !== undefined) {
        const picture = layout.picture;
        const boardProfile = board?.profile ?? profile;
        const scale = picture.w / boardProfile.outer;
        const title = layout.title;
        // The plate of the board centre, at the size of the title area: 1 is a plate on the standard 360 mm centre.
        const unit = title.h / (40 * titleFontOf(titleStyle, theme).scale + 6);
        const plateInset = 16 * unit;

        const turn = look === 'modern' ? 0 : -3;

        return (
            <>
                <LidBackground look={look} w={w} h={h} bleed={bleed} />
                <LidFrame look={look} w={w} h={h} bleed={bleed} />
                {look === 'playful' && (
                    <LidConfetti picture={picture} w={w} h={h} />
                )}
                {/* The ribbon ends of Klassiek and the tilt stay inside the frame. */}
                <Abs
                    x={title.x + plateInset}
                    y={title.y}
                    w={title.w - 2 * plateInset}
                    h={title.h}
                    slot="lid-plate"
                >
                    <EditionTitle
                        name={editionName}
                        tagline={undefined}
                        mode="name"
                        photo={undefined}
                        photoAspect={undefined}
                        photoRotation={0}
                        photoFrame={false}
                        w={title.w - 2 * plateInset}
                        h={title.h}
                        unit={unit}
                        titleStyle={titleStyle}
                    />
                </Abs>
                {!boardPicture ? null : mode === 'logo' ? (
                    /* The logo of the board centre, whole and straight in the place of the board (B241). */
                    <PhotoSlot {...picture} photo={photo} />
                ) : (
                    <>
                        {look === 'modern' ? (
                            /* Modern: the board straight on a flat block in the strong colour of the theme. */
                            <OffsetBlock rect={picture} />
                        ) : (
                            /* A flat shadow in a darker tone of the lid: print colours, no blur (B87). */
                            <Abs
                                x={picture.x + picture.w * 0.025}
                                y={picture.y + picture.w * 0.03}
                                w={picture.w}
                                h={picture.h}
                                style={{
                                    background: mix(
                                        theme.ink,
                                        look === 'vintage'
                                            ? vintageLid(theme)
                                            : theme.boardBackground,
                                        0.86,
                                    ),
                                    transform: `rotate(${String(turn)}deg)`,
                                }}
                            />
                        )}
                        <Abs
                            x={picture.x}
                            y={picture.y}
                            w={picture.w}
                            h={picture.h}
                            style={{
                                transform: `rotate(${String(turn)}deg)`,
                                overflow: 'hidden',
                                boxShadow: `0 0 0 ${mm(0.4)} ${theme.ink}`,
                            }}
                            slot="lid-board"
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    width: mm(boardProfile.outer),
                                    height: mm(boardProfile.outer),
                                    transform: `scale(${String(scale)})`,
                                    transformOrigin: 'top left',
                                }}
                            >
                                <Board
                                    theme={theme.id}
                                    locale={locale}
                                    currency={currency}
                                    words={words}
                                    {...(style === undefined ? {} : { style })}
                                    editionName={editionName}
                                    {...board}
                                    profile={boardProfile}
                                    bleedMm={0}
                                />
                            </div>
                        </Abs>
                        {look === 'playful' && (
                            <Abs
                                {...picture}
                                style={{
                                    transform: `rotate(${String(turn)}deg)`,
                                }}
                            >
                                <TapeCorners w={picture.w} h={picture.h} />
                            </Abs>
                        )}
                    </>
                )}
                {layout.subtitle !== undefined && (
                    <FitText
                        text={line}
                        {...layout.subtitle}
                        maxFontMm={subtitleFont}
                        minFontMm={3.5}
                        font="body"
                        {...lineText}
                        align="center"
                        slot="subtitle"
                    />
                )}
                {layout.lines !== undefined && (
                    <FitText
                        text={own}
                        {...layout.lines}
                        maxFontMm={linesFont}
                        minFontMm={3}
                        wrap="words"
                        font="body"
                        align="center"
                        lineHeight={1.3}
                        slot="lines"
                    />
                )}
                {layout.strip !== undefined && (
                    <LidStrip
                        look={look}
                        rect={layout.strip}
                        w={w}
                        h={h}
                        bleed={bleed}
                    />
                )}
            </>
        );
    }

    return (
        <>
            <LidBackground look={look} w={w} h={h} bleed={bleed} />
            <LidFrame look={look} w={w} h={h} bleed={bleed} />
            {look === 'modern' && (
                <ModernBand y={h - 9} w={w} h={h} bleed={bleed} />
            )}
            {layout.photo !== undefined && (
                <>
                    {look === 'modern' && <OffsetBlock rect={layout.photo} />}
                    {look === 'playful' ? (
                        /* Speels: the photo with round corners; the frame it is cropped to stays the same. */
                        <Abs
                            {...layout.photo}
                            style={{ borderRadius: mm(6), overflow: 'hidden' }}
                        >
                            <PhotoSlot
                                x={0}
                                y={0}
                                w={layout.photo.w}
                                h={layout.photo.h}
                                photo={photo}
                            />
                        </Abs>
                    ) : (
                        <PhotoSlot {...layout.photo} photo={photo} />
                    )}
                    <PhotoMat look={look} rect={layout.photo} />
                </>
            )}
            {text}
        </>
    );
};
