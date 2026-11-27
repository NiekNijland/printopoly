import { SPARTAN } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';
import { useFitTextWidth } from '@/lib/render/use-fit-text';

import type { PlateLook } from './edition-title';
import {
    TiltedPlate,
    useShownName,
    type TitleProps,
} from './edition-title-shared';
import { FitText } from './fit-text';
import { useRender, BoxSvg } from './sheet';

const usePlateText = ({
    name: typed,
    tagline,
    w,
    unit,
    look,
    font,
}: TitleProps) => {
    const { theme } = useRender();
    const name = useShownName(typed, font.upper);
    const heading = font.family;
    const weight = font.weight;
    const tagFont = look.tagInHeading === true ? theme.headingFont : SPARTAN;
    const tagWeight = look.tagInHeading === true ? theme.headingWeight : 800;
    const maxInner = w * 0.84;
    const { result, widthMm } = useFitTextWidth({
        text: name,
        widthMm: maxInner,
        heightMm: 40 * font.scale * unit,
        maxFontMm: 27 * font.scale * unit,
        minFontMm: 6,
        fontFamily: heading,
        fontWeight: weight,
        lineHeight: 1,
    });
    const size = result.fontSizeMm;
    const tag = tagline === undefined || tagline.trim() === '' ? null : tagline;
    const tagFit = useFitTextWidth({
        text: tag ?? '',
        widthMm: w * 0.6,
        heightMm: 10 * unit,
        maxFontMm: 7 * unit,
        minFontMm: 3,
        fontFamily: tagFont,
        fontWeight: tagWeight,
        lineHeight: 1,
    });
    const tagSize = tagFit.result.fontSizeMm;
    const pillH = tag === null ? 0 : tagSize * 1.9;
    const pillW = tagFit.widthMm / (1 - 0.03) + tagSize * 2.6;

    return {
        look,
        name,
        heading,
        weight,
        tagWeight,
        size,
        widthMm,
        tag,
        tagSize,
        pillH,
        pillW,
    };
};

type PlateText = ReturnType<typeof usePlateText>;

const plateLayout = (
    { withPhoto, w, h, unit }: TitleProps,
    { look, size, widthMm, pillW, pillH }: PlateText,
) => {
    const padX = size * 0.6;
    const padY = size * 0.3;
    const textW = widthMm / (1 - 0.03) + 1;
    const plateW = Math.min(
        w * 0.96,
        Math.max(textW + padX * 2, pillW + padX, 80 * unit),
    );
    const belowText = pillH * 0.42;
    const plateH = size * 1 + padY * 2 + belowText;
    const lift = withPhoto ? 6 * unit : 0;
    const plateX = (w - plateW) / 2;
    const plateY = (h - plateH) / 2 + lift;
    const stroke = 1.7 * (look.edgeScale ?? 1) * unit;
    const rx = look.radius * unit;

    const overlap = padY * 0.5;
    const tilt = look.tilt;
    const flap = 13 * unit;
    const drop = plateH * 0.2;

    return {
        padY,
        textW,
        plateW,
        belowText,
        plateH,
        plateX,
        plateY,
        stroke,
        rx,
        overlap,
        tilt,
        flap,
        drop,
    };
};

type PlateLayout = ReturnType<typeof plateLayout>;

const PlateShape = ({
    look,
    layout,
    unit,
    ink,
}: {
    look: PlateLook;
    layout: PlateLayout;
    unit: number;
    ink: string;
}) => {
    const { plateW, plateH, stroke, rx, flap, drop } = layout;

    return (
        <BoxSvg w={plateW} h={plateH} overflow="visible">
            {look.back !== undefined && (
                <rect
                    x={-3.2 * unit}
                    y={3.4 * unit}
                    width={plateW}
                    height={plateH}
                    rx={rx}
                    fill={look.back}
                    stroke={ink}
                    strokeWidth={stroke}
                />
            )}
            {look.flap !== undefined && (
                <>
                    <polygon
                        points={`${-flap},${drop} ${stroke},${drop} ${stroke},${plateH + drop} ${-flap},${plateH + drop} ${-flap + flap * 0.38},${plateH / 2 + drop}`}
                        fill={look.flap}
                        stroke={ink}
                        strokeWidth={stroke}
                        strokeLinejoin="round"
                    />
                    <polygon
                        points={`${plateW + flap},${drop} ${plateW - stroke},${drop} ${plateW - stroke},${plateH + drop} ${plateW + flap},${plateH + drop} ${plateW + flap - flap * 0.38},${plateH / 2 + drop}`}
                        fill={look.flap}
                        stroke={ink}
                        strokeWidth={stroke}
                        strokeLinejoin="round"
                    />
                </>
            )}
            <rect
                x={stroke / 2}
                y={stroke / 2}
                width={plateW - stroke}
                height={plateH - stroke}
                rx={rx}
                fill={look.fill}
                stroke={ink}
                strokeWidth={stroke}
                strokeLinejoin="round"
            />
            <rect
                x={stroke + 1.5 * unit}
                y={stroke + 1.5 * unit}
                width={plateW - 2 * stroke - 3 * unit}
                height={plateH - 2 * stroke - 3 * unit}
                rx={Math.max(0, rx - 1)}
                fill="none"
                stroke={look.inner ?? look.text}
                strokeWidth={0.5 * unit}
                opacity={look.inner === undefined ? 0.55 : 0.9}
            />
        </BoxSvg>
    );
};

const PlateName = ({
    text,
    layout,
    unit,
}: {
    text: PlateText;
    layout: PlateLayout;
    unit: number;
}) => {
    const { look, name, heading, weight, size } = text;
    const { plateW, textW, padY, belowText } = layout;

    return (
        <>
            {look.shadow !== undefined && (
                <FitText
                    text={name}
                    x={(plateW - textW) / 2 + 0.9 * unit}
                    y={padY - belowText / 2 + 0.9 * unit}
                    w={textW}
                    h={size + 1}
                    maxFontMm={size}
                    minFontMm={size}
                    family={heading}
                    weight={weight}
                    color={look.shadow}
                    align="center"
                    valign="middle"
                    lineHeight={1}
                />
            )}
            <FitText
                text={name}
                x={(plateW - textW) / 2}
                y={padY - belowText / 2}
                w={textW}
                h={size + 1}
                maxFontMm={size}
                minFontMm={size}
                family={heading}
                weight={weight}
                color={look.text}
                align="center"
                valign="middle"
                lineHeight={1}
                slot="edition-name"
            />
        </>
    );
};

const PlateTagline = ({
    tag,
    text,
    layout,
    unit,
}: {
    tag: string;
    text: PlateText;
    layout: PlateLayout;
    unit: number;
}) => {
    const { look, tagSize, tagWeight, pillW, pillH } = text;
    const { plateW, plateH } = layout;

    return (
        <div
            style={{
                position: 'absolute',
                left: mm((plateW - pillW) / 2),
                top: mm(plateH - pillH * 0.62),
                width: mm(pillW),
                height: mm(pillH),
                boxSizing: 'border-box',
                background: look.pillFill,
                border: `${mm(1.1 * (look.edgeScale ?? 1) * unit)} solid ${look.pillStroke}`,
                borderRadius: mm(look.radius === 0 ? 0 : pillH),
            }}
            data-slot="edition-tagline-pill"
        >
            <FitText
                text={tag}
                x={0}
                y={0}
                w={pillW - 2.2 * unit}
                h={pillH - 2.2 * unit}
                maxFontMm={tagSize}
                minFontMm={tagSize}
                font="heading"
                weight={tagWeight}
                color={look.pillText}
                align="center"
                valign="middle"
                lineHeight={1}
                slot="edition-tagline"
            />
        </div>
    );
};

export const PlateTitle = (props: TitleProps) => {
    const { withPhoto, unit, titleStyle, photoOnTitle } = props;
    const { theme } = useRender();
    const text = usePlateText(props);
    const layout = plateLayout(props, text);
    const { plateY, tilt, overlap } = layout;
    const ink = text.look.edge ?? theme.ink;

    return (
        <>
            <TiltedPlate layout={layout} titleStyle={titleStyle ?? 'theme'}>
                <PlateShape
                    look={text.look}
                    layout={layout}
                    unit={unit}
                    ink={ink}
                />
                <PlateName text={text} layout={layout} unit={unit} />
                {text.tag !== null && (
                    <PlateTagline
                        tag={text.tag}
                        text={text}
                        layout={layout}
                        unit={unit}
                    />
                )}
            </TiltedPlate>
            {withPhoto && photoOnTitle(plateY + overlap, tilt)}
        </>
    );
};
