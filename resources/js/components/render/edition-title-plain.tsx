import { mm } from '@/lib/render/units';
import { useFitTextWidth } from '@/lib/render/use-fit-text';

import { taglineOf, type TitleProps } from './edition-title-shared';
import { FitText } from './fit-text';
import { useRender } from './sheet';

const usePlainLayout = ({
    name,
    tagline,
    withPhoto,
    w,
    h,
    unit,
    font,
}: TitleProps) => {
    const { theme } = useRender();
    const tag = taglineOf(tagline);
    const tagFit = useFitTextWidth({
        text: tag ?? '',
        widthMm: w * 0.7,
        heightMm: 9 * unit,
        maxFontMm: 6.5 * unit,
        minFontMm: 3,
        fontFamily: theme.bodyFont,
        fontWeight: 600,
        lineHeight: 1,
    });
    const tagSize = tag === null ? 0 : tagFit.result.fontSizeMm;
    const line = font.scale > 1 ? 1.25 : 1.05;
    const nameRoom = (h * 0.92 - tagSize * 1.5) / line;
    const { result, widthMm } = useFitTextWidth({
        text: name,
        widthMm: w * 0.9,
        heightMm: Math.min(40 * font.scale * unit, nameRoom * line),
        maxFontMm: Math.min(27 * font.scale * unit, nameRoom),
        minFontMm: 6,
        fontFamily: font.family,
        fontWeight: font.weight,
        lineHeight: line,
    });
    const size = result.fontSizeMm;
    const textW = widthMm / (1 - 0.03) + 2;
    const nameH = size * line;
    const gap = tag === null ? 0 : size * 0.12;
    const blockH = nameH + gap + tagSize * 1.3;
    const lift = withPhoto ? 6 * unit : 0;
    const top = (h - blockH) / 2 + lift;
    const tagW = tagFit.widthMm / (1 - 0.03) + 1;

    return { font, tag, tagSize, line, size, textW, nameH, gap, top, tagW };
};

/**
 * "Alleen tekst" (Niek, 22 nov): the name in the title font of the theme in ink, the tagline under it in the body
 * font, and nothing behind them.
 */
export const PlainTitle = (props: TitleProps) => {
    const { name, w, h, unit, withPhoto, photoOnTitle } = props;
    const { theme } = useRender();
    const { font, tag, tagSize, line, size, textW, nameH, gap, top, tagW } =
        usePlainLayout(props);

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
                data-title-style="plain"
            >
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
                    color={theme.ink}
                    align="center"
                    valign="middle"
                    lineHeight={line}
                    slot="edition-name"
                />
                {tag !== null && (
                    <FitText
                        text={tag}
                        x={(w - tagW) / 2}
                        y={top + nameH + gap}
                        w={tagW}
                        h={tagSize * 1.3}
                        maxFontMm={tagSize}
                        minFontMm={tagSize}
                        family={theme.bodyFont}
                        weight={600}
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
