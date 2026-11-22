import { withAlpha } from '@/lib/render/color';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { THEMES } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { FitText } from './fit-text';
import { BAND_OPACITY, PhotoSlot, isFullPhoto } from './photo-slot';
import { Abs, Sheet, useRender, type ElementProps } from './sheet';

/** Unfolded pawn: front, back (upside down, so it stands when folded) and an insertion foot. */
export const PAWN_SIZE_MM = { w: 40, h: 55 } as const;

const PANEL_HEIGHT = 22.5;
/** The framed photo on a pawn: nearly square, so a face fills it instead of a thin strip (ronde 3, UX 1). */
const PORTRAIT = { w: 17, h: 16 } as const;

export interface PawnSheetItemProps extends ElementProps {
    name: string;
    photo?: PhotoSource;
}

function PawnFace({ name, photo }: { name: string; photo?: PhotoSource }) {
    const { w } = PAWN_SIZE_MM;
    const { theme } = useRender();

    // Without a photo the pawn is text only: the name fills the panel.
    if (photo === undefined) {
        return (
            <FitText
                text={name}
                x={3}
                y={3}
                w={w - 6}
                h={PANEL_HEIGHT - 6}
                maxFontMm={7}
                minFontMm={2}
                wrap="words"
                font="heading"
                align="center"
                slot="name"
            />
        );
    }

    // "Full": the photo fills the whole panel and the name sits on a light band at its foot (B124).
    if (isFullPhoto(photo)) {
        const bandHeight = 7;

        return (
            <>
                <PhotoSlot x={0} y={0} w={w} h={PANEL_HEIGHT} photo={photo} />
                <Abs
                    x={0}
                    y={PANEL_HEIGHT - bandHeight}
                    w={w}
                    h={bandHeight}
                    style={{
                        background: withAlpha(theme.paper, BAND_OPACITY),
                    }}
                    slot="name-band"
                />
                <FitText
                    text={name}
                    x={3}
                    y={PANEL_HEIGHT - bandHeight + 0.6}
                    w={w - 6}
                    h={bandHeight - 1.2}
                    maxFontMm={4}
                    minFontMm={2}
                    font="heading"
                    align="center"
                    slot="name"
                />
            </>
        );
    }

    // A portrait frame in the middle, the shape of a head and shoulders, so faces fit (ronde 3, UX 1).
    return (
        <>
            <PhotoSlot
                x={(w - PORTRAIT.w) / 2}
                y={1.5}
                w={PORTRAIT.w}
                h={PORTRAIT.h}
                photo={photo}
            />
            <FitText
                text={name}
                x={3}
                y={1.5 + PORTRAIT.h + 0.5}
                w={w - 6}
                h={PANEL_HEIGHT - PORTRAIT.h - 2.5}
                maxFontMm={4}
                minFontMm={2}
                font="heading"
                align="center"
                slot="name"
            />
        </>
    );
}

/** One pawn on the sheet, 40 x 55 mm, with its two fold lines. */
export function PawnSheetItem({ name, photo, ...element }: PawnSheetItemProps) {
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
}

function FoldLines() {
    const { theme, locale } = useRender();
    const { w, h } = PAWN_SIZE_MM;
    const t = STRINGS[locale];

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
                align="center"
                // Readable, not a hairline colour: the word was 3.2 : 1 (bug 31, ronde 4).
                color={theme.ink}
            />
        </>
    );
}
