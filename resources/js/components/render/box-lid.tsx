import { DEFAULT_BOARD_PROFILE, type BoardProfile } from '@/lib/print/board';
import { lidLayout, type LidPhoto } from '@/lib/render/box-lid-layout';
import { withAlpha } from '@/lib/render/color';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { THEMES } from '@/lib/render/themes';

import { FitText } from './fit-text';
import { FreeLayers, type RenderLayer } from './free-layers';
import { Icon } from './icons';
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
}) {
    const { theme, locale } = useRender();
    const line = subtitle ?? STRINGS[locale].boxLidSubtitle;
    const own = lines?.trim() ?? '';
    const mode: LidPhoto =
        photo === undefined ? 'none' : isFullPhoto(photo) ? 'full' : 'framed';
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

    return (
        <>
            <Frame
                ornate
                x={6}
                y={6}
                w={w - 12}
                h={h - 12}
                color={theme.ink}
                strokeMm={theme.frameMm + 0.2}
            />
            {layout.photo !== undefined && (
                <PhotoSlot {...layout.photo} photo={photo} />
            )}
            {layout.icons !== undefined &&
                (['dice', 'chest', 'train', 'car'] as const).map(
                    (name, index) => (
                        <Icon
                            key={name}
                            name={name}
                            x={(layout.icons?.x ?? 0) + index * 28}
                            y={layout.icons?.y ?? 0}
                            size={26}
                            color={index % 2 === 0 ? theme.ink : theme.accent}
                            strokeWidth={1.3}
                        />
                    ),
                )}
            {text}
        </>
    );
}
