import { standardEdition } from '@/lib/game/standard-edition';
import type { GroupId } from '@/lib/game/types';
import { DEFAULT_BOARD_PROFILE, type BoardProfile } from '@/lib/print/board';
import { lidLayout, type LidPhoto } from '@/lib/render/box-lid-layout';
import { mix, withAlpha } from '@/lib/render/color';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { THEMES } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { Board, type BoardProps } from './board';
import { EditionTitle } from './edition-title';
import { FitText } from './fit-text';
import { FreeLayers, type RenderLayer } from './free-layers';
import {
    BAND_OPACITY,
    LIGHT_TEXT_SHADOW,
    PhotoSlot,
    isFullPhoto,
} from './photo-slot';
import { Abs, Frame, Sheet, useRender, type ElementProps } from './sheet';

export interface BoxLidProps extends ElementProps {
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
}

/** The sticker for the box lid, sized by the board profile (B57). */
export function BoxLid({
    editionName,
    subtitle,
    lines,
    profile = DEFAULT_BOARD_PROFILE,
    photo,
    titleOffset,
    titleBand,
    layers,
    board,
    logo = false,
    ...element
}: BoxLidProps) {
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
                bleed={element.bleedMm ?? 0}
                board={board}
                profile={profile}
                logo={logo}
            />
            {layers !== undefined && <FreeLayers layers={layers} />}
        </Sheet>
    );
}

/** A dark fade behind light text on a photo without the band: strongest in the middle of the text block. */
const TEXT_FADE =
    'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.5) 30%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0))';

function LidFace({
    w,
    h,
    editionName,
    subtitle,
    lines,
    photo,
    titleOffset,
    titleBand = true,
    bleed,
    board,
    profile,
    logo,
}: {
    w: number;
    h: number;
    editionName: string;
    subtitle?: string;
    lines?: string;
    photo?: PhotoSource;
    titleOffset?: number;
    titleBand?: boolean;
    bleed: number;
    board?: BoardProps;
    profile: BoardProfile;
    logo: boolean;
}) {
    const { theme, locale, currency, words, style } = useRender();
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
                maxFontMm={24 * theme.titleScale}
                minFontMm={6}
                font="title"
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
        return (
            <>
                <PhotoSlot
                    x={-bleed}
                    y={-bleed}
                    w={w + 2 * bleed}
                    h={h + 2 * bleed}
                    photo={photo}
                />
                <Frame
                    x={6}
                    y={6}
                    w={w - 12}
                    h={h - 12}
                    color={theme.paper}
                    strokeMm={theme.frameMm + 0.2}
                />
                <Abs
                    x={-bleed}
                    y={layout.block.y - (onPhoto ? 8 : 0)}
                    w={w + 2 * bleed}
                    h={layout.block.h + (onPhoto ? 16 : 0)}
                    style={{
                        background: onPhoto
                            ? TEXT_FADE
                            : withAlpha(theme.paper, BAND_OPACITY),
                    }}
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
        const unit = title.h / (40 * theme.titleScale + 6);
        const plateInset = 16 * unit;

        return (
            <>
                <Frame
                    ornate
                    x={6}
                    y={6}
                    w={w - 12}
                    h={h - 12}
                    color={
                        theme.ornament === undefined ? theme.ink : theme.accent
                    }
                    strokeMm={theme.frameMm + 0.2}
                />
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
                    />
                </Abs>
                {mode === 'logo' ? (
                    /* The logo of the board centre, whole and straight in the place of the board (B241). */
                    <PhotoSlot {...picture} photo={photo} />
                ) : (
                    <>
                        {/* A flat shadow in a darker tone of the lid: print colours, no blur (B87). */}
                        <Abs
                            x={picture.x + picture.w * 0.025}
                            y={picture.y + picture.w * 0.03}
                            w={picture.w}
                            h={picture.h}
                            style={{
                                background: mix(
                                    theme.ink,
                                    theme.boardBackground,
                                    0.86,
                                ),
                                transform: 'rotate(-3deg)',
                            }}
                        />
                        <Abs
                            x={picture.x}
                            y={picture.y}
                            w={picture.w}
                            h={picture.h}
                            style={{
                                transform: 'rotate(-3deg)',
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
                    </>
                )}
                {layout.subtitle !== undefined && (
                    <FitText
                        text={line}
                        {...layout.subtitle}
                        maxFontMm={subtitleFont}
                        minFontMm={3.5}
                        font="body"
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
                    <ColourStrip rect={layout.strip} />
                )}
            </>
        );
    }

    return (
        <>
            <Frame
                ornate
                x={6}
                y={6}
                w={w - 12}
                h={h - 12}
                color={theme.ornament === undefined ? theme.ink : theme.accent}
                strokeMm={theme.frameMm + 0.2}
            />
            {layout.photo !== undefined && (
                <PhotoSlot {...layout.photo} photo={photo} />
            )}
            {text}
        </>
    );
}

/** The street colours of the edition in a row, as on the board: its own colours, else the theme's (B256). */
function ColourStrip({
    rect,
}: {
    rect: { x: number; y: number; w: number; h: number };
}) {
    const { theme, style } = useRender();
    const groups = standardEdition.groups;
    const colour = (id: GroupId, standard: string): string =>
        style?.groupColors?.[id] ?? theme.groupColors?.[id] ?? standard;

    return (
        <Abs
            x={rect.x}
            y={rect.y}
            w={rect.w}
            h={rect.h}
            style={{ display: 'flex', gap: mm(1) }}
            slot="lid-strip"
        >
            {groups.map((group) => (
                <span
                    key={group.id}
                    style={{
                        flex: 1,
                        background: colour(group.id, group.color),
                    }}
                />
            ))}
        </Abs>
    );
}
