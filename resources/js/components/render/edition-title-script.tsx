import { PLAYFAIR } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';
import { useFitTextWidth } from '@/lib/render/use-fit-text';

import {
    taglineOf,
    useShownName,
    type TitleProps,
} from './edition-title-shared';
import { FitText } from './fit-text';
import { useRender } from './sheet';

/** A diamond of half-size `r` around (cx, cy), for the script rule. */
const diamondPoints = (cx: number, cy: number, r: number): string => {
    return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
};

const useScriptLayout = ({
    name,
    tagline,
    withPhoto,
    w,
    h,
    unit,
    font,
    mark,
}: TitleProps) => {
    const tag = taglineOf(tagline);
    const upperTag = useShownName(tag ?? '', true);
    const tagFit = useFitTextWidth({
        text: upperTag,
        widthMm: w * 0.5,
        heightMm: 7 * unit,
        maxFontMm: 5.4 * unit,
        minFontMm: 2.6,
        fontFamily: PLAYFAIR,
        fontWeight: 700,
        lineHeight: 1,
    });
    const tagSize = tagFit.result.fontSizeMm;
    const row = tag === null ? 3 * unit : tagSize * 1.6;
    const gap = 1.5 * unit;
    // A script reaches above and below its line: the line box is 1.25 times the size.
    const nameRoom = (h * 0.92 - row - gap) / 1.25;
    const { result, widthMm } = useFitTextWidth({
        text: name,
        widthMm: w * 0.88,
        heightMm: Math.min(54 * unit, nameRoom * 1.25),
        maxFontMm: Math.min(27 * font.scale * unit, nameRoom),
        minFontMm: 6,
        fontFamily: font.family,
        fontWeight: font.weight,
        lineHeight: 1.25,
    });
    const size = result.fontSizeMm;
    const textW = widthMm / (1 - 0.03) + 2;
    const nameH = size * 1.25;
    const blockH = nameH + gap + row;
    const lift = withPhoto ? 6 * unit : 0;
    const top = (h - blockH) / 2 + lift;
    const rowY = top + nameH + gap + row / 2;
    const tagW = tag === null ? 0 : tagFit.widthMm / (1 - 0.03) + 1;
    const half = Math.min(w / 2, Math.max(textW * 0.45, tagW / 2 + 20 * unit));
    const diamond = 1.3 * unit;
    const inner = tag === null ? 0 : tagW / 2 + tagSize * 1.2;

    return {
        mark,
        font,
        tag,
        upperTag,
        tagSize,
        row,
        size,
        textW,
        nameH,
        top,
        rowY,
        tagW,
        half,
        diamond,
        inner,
    };
};

const ScriptRule = ({
    w,
    h,
    unit,
    layout,
}: {
    w: number;
    h: number;
    unit: number;
    layout: ReturnType<typeof useScriptLayout>;
}) => {
    const { mark, inner, diamond, half, rowY } = layout;

    return (
        <svg
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: mm(w),
                height: mm(h),
                overflow: 'visible',
            }}
            viewBox={`0 0 ${w} ${h}`}
            aria-hidden="true"
        >
            {[-1, 1].map((side) => (
                <g key={side}>
                    <line
                        x1={w / 2 + side * (inner + diamond * 2)}
                        x2={w / 2 + side * half}
                        y1={rowY}
                        y2={rowY}
                        stroke={mark}
                        strokeWidth={0.45 * unit}
                        strokeLinecap="round"
                    />
                    <polygon
                        points={diamondPoints(
                            w / 2 + side * inner,
                            rowY,
                            diamond,
                        )}
                        fill={mark}
                    />
                </g>
            ))}
        </svg>
    );
};

/**
 * "Sierlijk" (Niek, 22 nov): the name in the script of Gala in the strong ink of the theme, with no shape behind it,
 * and under it a fine rule with a diamond on each side of the tagline in serif capitals.
 */
export const ScriptTitle = (props: TitleProps) => {
    const { name, w, h, unit, withPhoto, photoOnTitle } = props;
    const { theme } = useRender();
    const layout = useScriptLayout(props);
    const {
        mark,
        font,
        tag,
        upperTag,
        tagSize,
        row,
        size,
        textW,
        nameH,
        top,
        rowY,
        tagW,
    } = layout;

    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: mm(w),
                    height: mm(h),
                }}
                data-slot="edition-plate"
                data-title-style="script"
            >
                <ScriptRule w={w} h={h} unit={unit} layout={layout} />
                <FitText
                    text={name}
                    x={(w - textW) / 2}
                    y={top}
                    w={textW}
                    h={nameH}
                    maxFontMm={size}
                    minFontMm={size}
                    family={font.family}
                    weight={font.weight}
                    color={mark}
                    align="center"
                    valign="middle"
                    lineHeight={1.25}
                    slot="edition-name"
                />
                {tag !== null && (
                    <FitText
                        text={upperTag}
                        x={(w - tagW) / 2}
                        y={rowY - row / 2}
                        w={tagW}
                        h={row}
                        maxFontMm={tagSize}
                        minFontMm={tagSize}
                        family={PLAYFAIR}
                        weight={700}
                        color={theme.ink}
                        align="center"
                        valign="middle"
                        lineHeight={1}
                        slot="edition-tagline"
                    />
                )}
            </div>
            {withPhoto && photoOnTitle(top - unit, 0)}
        </>
    );
};
