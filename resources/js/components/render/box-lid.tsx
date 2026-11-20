import { DEFAULT_BOARD_PROFILE, type BoardProfile } from '@/lib/print/board';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { resolveLayout, THEMES, type Layout } from '@/lib/render/themes';

import { FitText } from './fit-text';
import { FreeLayers, type RenderLayer } from './free-layers';
import { Icon } from './icons';
import { PhotoSlot } from './photo-slot';
import { Abs, Frame, Sheet, useRender, type ElementProps } from './sheet';

export interface BoxLidProps extends ElementProps {
    editionName: string;
    /** Line under the name; defaults to the number of players text. */
    subtitle?: string;
    profile?: BoardProfile;
    layout?: Layout;
    photo?: PhotoSource;
    placeholder?: boolean;
    /** Free text and photo layers in mm from the top left of the lid. */
    layers?: readonly RenderLayer[];
}

/** The sticker for the box lid, sized by the board profile (B57). */
export function BoxLid({
    editionName,
    subtitle,
    profile = DEFAULT_BOARD_PROFILE,
    layout,
    photo,
    placeholder = false,
    layers,
    ...element
}: BoxLidProps) {
    const { w, h } = profile.boxLid;
    const theme = THEMES[element.theme];
    const requested = resolveLayout(element.theme, 'lid', layout);
    // Without a photo or placeholder the photo layouts would leave a large empty area.
    const resolved =
        requested !== 'text' && photo === undefined && !placeholder
            ? 'text'
            : requested;
    const bleed = element.bleedMm ?? 0;
    const full = resolved === 'full' && photo !== undefined;

    return (
        <Sheet
            {...element}
            element="box-lid"
            widthMm={w}
            heightMm={h}
            background={theme.boardBackground}
            underlay={
                full ? (
                    <PhotoSlot
                        x={0}
                        y={0}
                        w={w + 2 * bleed}
                        h={h + 2 * bleed}
                        photo={photo}
                    />
                ) : undefined
            }
        >
            <LidFace
                w={w}
                h={h}
                editionName={editionName}
                subtitle={subtitle}
                layout={resolved}
                photo={photo}
                placeholder={placeholder}
            />
            {layers !== undefined && <FreeLayers layers={layers} />}
        </Sheet>
    );
}

function LidFace({
    w,
    h,
    editionName,
    subtitle,
    layout,
    photo,
    placeholder,
}: {
    w: number;
    h: number;
    editionName: string;
    subtitle?: string;
    layout: Layout;
    photo?: PhotoSource;
    placeholder: boolean;
}) {
    const { theme, locale } = useRender();
    const line = subtitle ?? STRINGS[locale].boxLidSubtitle;
    const full = layout === 'full' && photo !== undefined;
    const framed = layout === 'framed';
    const photoHeight = h * 0.58;
    const nameTop = framed ? 10 + photoHeight + 6 : full ? h * 0.62 : h * 0.26;
    const nameHeight = framed ? h * 0.2 : full ? h * 0.2 : h * 0.26;

    return (
        <>
            {full && (
                <Abs
                    x={0}
                    y={h * 0.58}
                    w={w}
                    h={h * 0.42}
                    style={{ background: theme.paper, opacity: 0.92 }}
                />
            )}
            {!full && (
                <Frame
                    x={6}
                    y={6}
                    w={w - 12}
                    h={h - 12}
                    color={theme.ink}
                    strokeMm={theme.frameMm + 0.2}
                />
            )}
            {framed && (
                <PhotoSlot
                    x={12}
                    y={12}
                    w={w - 24}
                    h={photoHeight}
                    photo={photo}
                    placeholder={placeholder ? '#CFC6B2' : undefined}
                />
            )}
            <FitText
                text={editionName}
                x={12}
                y={nameTop}
                w={w - 24}
                h={nameHeight}
                maxFontMm={24}
                minFontMm={6}
                font="heading"
                align="center"
                color={theme.accent}
                slot="edition-name"
            />
            {layout === 'text' && (
                <>
                    {(['dice', 'chest', 'train', 'car'] as const).map(
                        (name, index) => (
                            <Icon
                                key={name}
                                name={name}
                                x={w / 2 - 54 + index * 28}
                                y={h * 0.72}
                                size={26}
                                color={
                                    index % 2 === 0 ? theme.ink : theme.accent
                                }
                                strokeWidth={1.3}
                            />
                        ),
                    )}
                </>
            )}
            <FitText
                text={line}
                x={12}
                y={nameTop + nameHeight + 2}
                w={w - 24}
                h={9}
                maxFontMm={5}
                minFontMm={3}
                font="body"
                align="center"
                slot="subtitle"
            />
        </>
    );
}
