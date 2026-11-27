import { mix, readableOn } from '@/lib/render/color';
import type { DeedStyle } from '@/lib/render/edition-part-styles';
import { PLAYFAIR } from '@/lib/render/themes';

import { Hatch } from './board-look-vintage';
import { creamed, diamondPath, engraving } from './card-look';
import { Awning, WobblyTile, scallopDepth } from './card-look-playful';
import { FitText } from './fit-text';
import { Abs, useRender, Svg } from './sheet';
import { deedLookOf } from './title-deed-styles';

type HeaderProps = {
    style: DeedStyle;
    w: number;
    /** Inset of the block from the trim edge, and its height (B133). */
    block: number;
    blockHeight: number;
    label: string;
    title: string;
    townText: string | undefined;
    band: string;
    onBand: string;
    street: boolean;
    bleed: number;
    seed: number;
};

const ModernDeedLabel = ({
    style,
    w,
    block,
    label,
    townText,
    on,
}: HeaderProps & { on: string }) => {
    const look = deedLookOf(style);
    const hasTown = townText !== undefined;
    const x = block;
    const bw = w - 2 * block;

    return (
        <>
            <FitText
                text={label}
                x={x}
                y={3.2}
                w={hasTown ? bw * 0.6 : bw}
                h={3}
                maxFontMm={2.1}
                minFontMm={1.5}
                {...look.label}
                color={on}
                align="left"
                slot="label"
            />
            {hasTown && (
                <FitText
                    text={townText}
                    x={x + bw * 0.6}
                    y={3.2}
                    w={bw * 0.4}
                    h={3}
                    maxFontMm={2.1}
                    minFontMm={1.5}
                    font="body"
                    weight={600}
                    color={on}
                    align="right"
                    slot="town"
                />
            )}
        </>
    );
};

const ModernDeedHeader = (props: HeaderProps) => {
    const { style, w, block, blockHeight, title, band, onBand, street, bleed } =
        props;
    const { theme } = useRender();
    const look = deedLookOf(style);
    const x = block;
    const bw = w - 2 * block;
    const fill = street ? band : theme.ink;
    const on = street ? onBand : theme.deedPaper;
    const bottom = block + blockHeight;

    return (
        <>
            <Abs
                x={-bleed}
                y={-bleed}
                w={w + 2 * bleed}
                h={bottom + bleed}
                style={{ background: fill }}
                slot="band"
            />
            <ModernDeedLabel {...props} on={on} />
            <Abs x={x} y={7} w={7} h={0.9} style={{ background: on }} />
            <FitText
                text={title}
                x={x}
                y={8.6}
                w={bw}
                h={bottom - 9.6}
                maxFontMm={6.4}
                minFontMm={2.2}
                wrap="words"
                {...look.name}
                lineHeight={0.95}
                color={on}
                align="left"
                valign="bottom"
                slot="name"
            />
        </>
    );
};

const VintageBand = ({
    w,
    block,
    blockHeight,
    band,
    onBand,
    street,
}: HeaderProps) => {
    const { theme } = useRender();
    const x = block;
    const bw = w - 2 * block;
    const engr = engraving(theme, theme.deedFrame);
    const fill = street ? band : mix(creamed(theme.deedPaper), '#FFFFFF', 0.5);
    const on = street ? onBand : theme.ink;

    return (
        <>
            <Abs
                x={x}
                y={block}
                w={bw}
                h={blockHeight}
                style={{ background: fill }}
                slot="band"
            />
            {street && (
                <Hatch
                    x={x}
                    y={block}
                    w={bw}
                    h={blockHeight}
                    color={
                        readableOn(band) === '#FFFFFF'
                            ? mix(band, '#FFFFFF', 0.5)
                            : mix(band, theme.ink, 0.6)
                    }
                    opacity={0.45}
                    strokeMm={0.1}
                />
            )}
            <Svg x={x} y={block} w={bw} h={blockHeight} slot="band-rule">
                <rect
                    x={0.15}
                    y={0.15}
                    width={bw - 0.3}
                    height={blockHeight - 0.3}
                    fill="none"
                    stroke={engr}
                    strokeWidth={0.3}
                />
                <rect
                    x={0.8}
                    y={0.8}
                    width={bw - 1.6}
                    height={blockHeight - 1.6}
                    fill="none"
                    stroke={street ? on : engr}
                    strokeOpacity={street ? 0.7 : 1}
                    strokeWidth={0.1}
                />
                {[2.6, bw - 2.6].map((cx) => (
                    <path
                        key={cx}
                        d={diamondPath(cx, 2.65, 0.55)}
                        fill={street ? on : engr}
                    />
                ))}
            </Svg>
        </>
    );
};

const VintageDeedHeader = (props: HeaderProps) => {
    const { style, w, block, label, title, townText, onBand, street } = props;
    const { theme } = useRender();
    const look = deedLookOf(style);
    const hasTown = townText !== undefined;
    const x = block;
    const bw = w - 2 * block;
    const on = street ? onBand : theme.ink;

    return (
        <>
            <VintageBand {...props} />
            <FitText
                text={label}
                x={x + 4}
                y={block + 1.4}
                w={bw - 8}
                h={3}
                maxFontMm={2}
                minFontMm={1.4}
                {...look.label}
                color={on}
                align="center"
                slot="label"
            />
            {hasTown && (
                <FitText
                    text={townText}
                    x={x + 2}
                    y={block + 4.5}
                    w={bw - 4}
                    h={2.8}
                    maxFontMm={2.2}
                    minFontMm={1.4}
                    family={PLAYFAIR}
                    weight={700}
                    caps
                    letterSpacingEm={0.16}
                    color={on}
                    align="center"
                    slot="town"
                />
            )}
            <FitText
                text={title}
                x={x + 2}
                y={block + (hasTown ? 7.4 : 5)}
                w={bw - 4}
                h={hasTown ? 8 : 10}
                maxFontMm={4.6}
                minFontMm={2.2}
                wrap="words"
                {...look.name}
                lineHeight={1.05}
                color={on}
                align="center"
                slot="name"
            />
        </>
    );
};

const PlayfulBand = ({
    w,
    block,
    blockHeight,
    band,
    street,
    seed,
}: HeaderProps) => {
    const { theme } = useRender();
    const x = block;
    const bw = w - 2 * block;

    return (
        <>
            <Abs x={x} y={block} w={bw} h={blockHeight} slot="band" />
            {street ? (
                <Awning
                    x={x}
                    y={block}
                    w={bw}
                    h={blockHeight}
                    color={band}
                    ink={theme.ink}
                />
            ) : (
                <WobblyTile
                    x={x}
                    y={block}
                    w={bw}
                    h={blockHeight}
                    radius={3}
                    seed={seed + 2}
                    fill={mix(theme.accent, theme.deedPaper, 0.88)}
                    ink={theme.ink}
                    strokeMm={0.35}
                    slot="label-tile"
                />
            )}
        </>
    );
};

const PlayfulDeedHeader = (props: HeaderProps) => {
    const {
        style,
        w,
        block,
        blockHeight,
        label,
        title,
        townText,
        onBand,
        street,
    } = props;
    const { theme } = useRender();
    const look = deedLookOf(style);
    const hasTown = townText !== undefined;
    const x = block;
    const bw = w - 2 * block;
    // Speels: an awning in the group colour for a street; a tinted tile for a station or a utility.
    const scallop = scallopDepth(bw);
    const textBottom = block + blockHeight - scallop - 0.4;
    const on = street ? onBand : theme.ink;

    return (
        <>
            <PlayfulBand {...props} />
            <FitText
                text={label}
                x={x + 3}
                y={block + 1.5}
                w={bw - 6}
                h={3}
                maxFontMm={2.3}
                minFontMm={1.5}
                {...look.label}
                color={on}
                align="center"
                slot="label"
            />
            {hasTown && (
                <FitText
                    text={townText}
                    x={x + 3}
                    y={block + 4.3}
                    w={bw - 6}
                    h={2.8}
                    maxFontMm={2.3}
                    minFontMm={1.4}
                    font="body"
                    weight={600}
                    color={on}
                    align="center"
                    slot="town"
                />
            )}
            <FitText
                text={title}
                x={x + 2.5}
                y={block + (hasTown ? 7 : 5)}
                w={bw - 5}
                h={
                    (street ? textBottom : block + blockHeight - 0.8) -
                    (block + (hasTown ? 7 : 5))
                }
                maxFontMm={5.2}
                minFontMm={2.2}
                wrap="words"
                {...look.name}
                lineHeight={1}
                color={on}
                align="center"
                slot="name"
            />
        </>
    );
};

/** The block at the top of both sides in a style: the label, the town if any, and the name. */
export const StyledDeedHeader = (props: HeaderProps) => {
    switch (props.style) {
        case 'modern':
            return <ModernDeedHeader {...props} />;
        case 'vintage':
            return <VintageDeedHeader {...props} />;
        case 'playful':
            return <PlayfulDeedHeader {...props} />;
    }
};
