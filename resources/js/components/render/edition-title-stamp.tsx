import { mm } from '@/lib/render/units';
import { useFitTextWidth } from '@/lib/render/use-fit-text';

import {
    taglineOf,
    useShownName,
    type TitleProps,
} from './edition-title-shared';
import { FitText } from './fit-text';
import { useRender } from './sheet';

/** How far the stamp leans, in degrees. */
const STAMP_TILT = 3;

/** A five-pointed star of radius `r` around (cx, cy), for the stamp. */
const starPoints = (cx: number, cy: number, r: number): string => {
    return Array.from({ length: 10 }, (_, index) => {
        const radius = index % 2 === 0 ? r : r * 0.45;
        const angle = (Math.PI / 5) * index - Math.PI / 2;

        return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
    }).join(' ');
};

const useStampText = ({
    name: typed,
    tagline,
    w,
    h,
    unit,
    font,
    mark,
}: TitleProps) => {
    const name = useShownName(typed, true);
    const tag = taglineOf(tagline);
    const upperTag = useShownName(tag ?? '', true);
    const tagFit = useFitTextWidth({
        text: upperTag,
        widthMm: w * 0.5,
        heightMm: 8 * unit,
        maxFontMm: 6 * unit,
        minFontMm: 2.6,
        fontFamily: font.family,
        fontWeight: font.weight,
        lineHeight: 1,
    });
    const tagSize = tagFit.result.fontSizeMm;
    const tagRow = tag === null ? 0 : tagSize * 2.4;
    // Room for the name: the stamp stays inside the title area, also on a low lid, with its tilt.
    const nameRoom =
        (h * 0.95 -
            w * 0.94 * Math.sin((STAMP_TILT * Math.PI) / 180) -
            tagRow) /
        1.8;
    const { result, widthMm } = useFitTextWidth({
        text: name,
        widthMm: w * 0.74,
        heightMm: Math.min(30 * unit, nameRoom * 1.2),
        maxFontMm: Math.min(25 * unit, nameRoom),
        minFontMm: 5,
        fontFamily: font.family,
        fontWeight: font.weight,
        lineHeight: 1,
    });
    const size = result.fontSizeMm;
    const textW = widthMm / (1 - 0.03) + 1;
    const tagW = tagFit.widthMm / (1 - 0.03) + 1;

    return {
        mark,
        font,
        name,
        tag,
        upperTag,
        tagSize,
        tagRow,
        size,
        textW,
        tagW,
    };
};

type StampText = ReturnType<typeof useStampText>;

const stampLayout = (
    { withPhoto, w, h, unit }: TitleProps,
    { tag, tagSize, tagRow, size, textW, tagW }: StampText,
) => {
    const padX = Math.max(size * 0.7, 9 * unit);
    const padTop = size * 0.42;
    const padBottom = size * 0.38;
    const plateW = Math.min(
        w * 0.94,
        Math.max(textW, tag === null ? 0 : tagW + tagSize * 5) + 2 * padX,
    );
    const plateH = padTop + size + tagRow + padBottom;
    const lift = withPhoto ? 6 * unit : 0;
    const plateX = (w - plateW) / 2;
    const plateY = (h - plateH) / 2 + lift;
    const outer = 1.3 * unit;
    const gap = 2.2 * unit;
    const rx = 3.5 * unit;
    const ruleY = padTop + size + tagSize * 0.55;
    const tagY = ruleY + tagSize * 0.45;
    const star = tagSize * 0.55;
    const tilt = -STAMP_TILT;

    return {
        padTop,
        plateW,
        plateH,
        plateX,
        plateY,
        outer,
        gap,
        rx,
        ruleY,
        tagY,
        star,
        tilt,
    };
};

type StampLayout = ReturnType<typeof stampLayout>;

const StampFrame = ({
    text,
    layout,
    unit,
}: {
    text: StampText;
    layout: StampLayout;
    unit: number;
}) => {
    const { theme } = useRender();
    const { mark, tag, tagSize, tagW } = text;
    const { plateW, plateH, outer, gap, rx, ruleY, tagY, star } = layout;

    return (
        <svg
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: mm(plateW),
                height: mm(plateH),
                overflow: 'visible',
            }}
            viewBox={`0 0 ${plateW} ${plateH}`}
            aria-hidden="true"
        >
            <rect
                x={outer / 2}
                y={outer / 2}
                width={plateW - outer}
                height={plateH - outer}
                rx={rx}
                fill={theme.paper}
                stroke={mark}
                strokeWidth={outer}
            />
            <rect
                x={outer + gap}
                y={outer + gap}
                width={plateW - 2 * (outer + gap)}
                height={plateH - 2 * (outer + gap)}
                rx={Math.max(0, rx - gap)}
                fill="none"
                stroke={mark}
                strokeWidth={0.5 * unit}
            />
            {tag !== null && (
                <>
                    <line
                        x1={plateW / 2 - tagW / 2 - tagSize * 2}
                        x2={plateW / 2 + tagW / 2 + tagSize * 2}
                        y1={ruleY}
                        y2={ruleY}
                        stroke={mark}
                        strokeWidth={0.4 * unit}
                    />
                    {[-1, 1].map((side) => (
                        <polygon
                            key={side}
                            points={starPoints(
                                plateW / 2 + side * (tagW / 2 + tagSize * 1.3),
                                tagY + tagSize * 0.85,
                                star,
                            )}
                            fill={mark}
                        />
                    ))}
                </>
            )}
        </svg>
    );
};

/**
 * "Stempel" (Niek, 22 nov): the name in capitals in the strong ink of the theme on paper, inside a double edge with
 * rounded corners, a little askew like a rubber stamp. The tagline sits under a thin line between two stars.
 */
export const StampTitle = (props: TitleProps) => {
    const { withPhoto, unit, photoOnTitle } = props;
    const text = useStampText(props);
    const layout = stampLayout(props, text);
    const { mark, font, name, tag, upperTag, tagSize, size, textW, tagW } =
        text;
    const { padTop, plateW, plateH, plateX, plateY, tagY, tilt } = layout;

    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    left: mm(plateX),
                    top: mm(plateY),
                    width: mm(plateW),
                    height: mm(plateH),
                    transform: `rotate(${tilt}deg)`,
                    transformOrigin: 'center',
                }}
                data-slot="edition-plate"
                data-title-style="stamp"
            >
                <StampFrame text={text} layout={layout} unit={unit} />
                <FitText
                    text={name}
                    x={(plateW - textW) / 2}
                    y={padTop}
                    w={textW}
                    h={size + 1}
                    maxFontMm={size}
                    minFontMm={size}
                    family={font.family}
                    weight={font.weight}
                    color={mark}
                    align="center"
                    valign="middle"
                    lineHeight={1}
                    slot="edition-name"
                />
                {tag !== null && (
                    <FitText
                        text={upperTag}
                        x={(plateW - tagW) / 2}
                        y={tagY}
                        w={tagW}
                        h={tagSize * 1.7}
                        maxFontMm={tagSize}
                        minFontMm={tagSize}
                        family={font.family}
                        weight={font.weight}
                        color={mark}
                        align="center"
                        valign="middle"
                        lineHeight={1}
                        slot="edition-tagline"
                    />
                )}
            </div>
            {withPhoto && photoOnTitle(plateY - 2 * unit, tilt)}
        </>
    );
};
