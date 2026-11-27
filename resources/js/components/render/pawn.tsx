import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { partStyleOf } from '@/lib/render/style';
import { THEMES } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { FitText } from './fit-text';
import { PawnFace } from './pawn-face';
import { PANEL_HEIGHT, PAWN_WIDTH } from './pawn-layout';
import { pieceText } from './piece-styles';
import { Abs, Sheet, useRender, type ElementProps } from './sheet';

/** Unfolded pawn: front, back (upside down, so it stands when folded) and an insertion foot. */
export const PAWN_SIZE_MM = { w: PAWN_WIDTH, h: 55 } as const;

export type PawnSheetItemProps = {
    name: string;
    photo?: PhotoSource;
} & ElementProps;

/** One pawn on the sheet, 40 x 55 mm, with its two fold lines. */
export const PawnSheetItem = ({
    name,
    photo,
    ...element
}: PawnSheetItemProps) => {
    const { w, h } = PAWN_SIZE_MM;
    const theme = THEMES[element.theme];

    return (
        <Sheet
            {...element}
            element="pawn"
            widthMm={w}
            heightMm={h}
            background={theme.paper}
        >
            <Abs x={0} y={0} w={w} h={PANEL_HEIGHT}>
                <PawnFace name={name} photo={photo} />
            </Abs>
            <Abs
                x={0}
                y={PANEL_HEIGHT}
                w={w}
                h={PANEL_HEIGHT}
                style={{ transform: 'rotate(180deg)' }}
                slot="back"
            >
                <PawnFace name={name} photo={photo} />
            </Abs>
            <FoldLines />
        </Sheet>
    );
};

const FoldLines = () => {
    const { theme, locale, style } = useRender();
    const { w, h } = PAWN_SIZE_MM;
    const t = STRINGS[locale];
    const look = partStyleOf(style, 'pawns');

    return (
        <>
            <svg
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: mm(w),
                    height: mm(h),
                }}
                viewBox={`0 0 ${w} ${h}`}
                aria-hidden="true"
                data-fold-lines=""
            >
                {[PANEL_HEIGHT, 2 * PANEL_HEIGHT].map((y) => (
                    <line
                        key={y}
                        x1={0}
                        y1={y}
                        x2={w}
                        y2={y}
                        stroke={theme.line}
                        strokeWidth={0.25}
                        strokeDasharray="1.5 1"
                    />
                ))}
            </svg>
            <FitText
                text={t.pawn}
                x={2}
                y={2 * PANEL_HEIGHT + 1}
                w={w - 4}
                h={h - 2 * PANEL_HEIGHT - 2}
                maxFontMm={2.6}
                minFontMm={1.8}
                font="body"
                {...pieceText(look, 'line')}
                align="center"
                // Readable, not a hairline colour: the word was 3.2 : 1 (bug 31, ronde 4).
                color={theme.ink}
            />
        </>
    );
};
