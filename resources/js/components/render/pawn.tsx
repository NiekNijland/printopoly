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
/**
 * Every pawn has the same two halves (R6 Tom, Sara): a portrait on the left, the photo or the first letter of the
 * name, and the name on the right, in the same box and so at the same size with or without a photo. The portrait
 * is a little taller than wide, the shape of a head and shoulders (ronde 3, UX 1).
 */
const PORTRAIT = { x: 1.5, y: 1.5, w: 17, h: PANEL_HEIGHT - 3 } as const;
const NAME_BOX = {
    x: PORTRAIT.x + PORTRAIT.w + 1.5,
    y: 1.5,
    w: PAWN_SIZE_MM.w - (PORTRAIT.x + PORTRAIT.w + 1.5) - 1.5,
    h: PANEL_HEIGHT - 3,
} as const;
/** The largest name on any pawn, with or without a photo, also on the band of a full photo. */
export const PAWN_NAME_MAX_MM = 5.5;

export interface PawnSheetItemProps extends ElementProps {
    name: string;
    photo?: PhotoSource;
}

/** The first letter of the name in a round stamp, where a pawn without a photo would have one. */
function Initial({ name }: { name: string }) {
    const { theme } = useRender();
    const letter = Array.from(name.trim())[0]?.toLocaleUpperCase() ?? '';
    const size = Math.min(PORTRAIT.w, PORTRAIT.h) - 1;

    return (
        <>
            <Abs
                x={PORTRAIT.x + (PORTRAIT.w - size) / 2}
                y={PORTRAIT.y + (PORTRAIT.h - size) / 2}
                w={size}
                h={size}
                slot="initial"
                style={{
                    borderRadius: '50%',
                    background: withAlpha(theme.accent, 0.18),
                    border: `${mm(Math.max(0.35, theme.frameMm))} solid ${theme.ink}`,
                    boxSizing: 'border-box',
                }}
            />
            {letter !== '' && (
                <FitText
                    text={letter}
                    x={PORTRAIT.x}
                    y={PORTRAIT.y}
                    w={PORTRAIT.w}
                    h={PORTRAIT.h}
                    maxFontMm={9}
                    minFontMm={4}
                    font="heading"
                    align="center"
                    valign="middle"
                    slot="initial-letter"
                />
            )}
        </>
    );
}

function PawnFace({ name, photo }: { name: string; photo?: PhotoSource }) {
    const { w } = PAWN_SIZE_MM;
    const { theme } = useRender();

    // "Full": the photo fills the whole panel and the name sits on a light band at its foot (B124).
    if (photo !== undefined && isFullPhoto(photo)) {
        const bandHeight = 8;

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
                    maxFontMm={PAWN_NAME_MAX_MM}
                    minFontMm={2}
                    font="heading"
                    align="center"
                    valign="middle"
                    slot="name"
                />
            </>
        );
    }

    return (
        <>
            {photo === undefined ? (
                <Initial name={name} />
            ) : (
                <PhotoSlot
                    x={PORTRAIT.x}
                    y={PORTRAIT.y}
                    w={PORTRAIT.w}
                    h={PORTRAIT.h}
                    photo={photo}
                />
            )}
            <FitText
                text={name}
                x={NAME_BOX.x}
                y={NAME_BOX.y}
                w={NAME_BOX.w}
                h={NAME_BOX.h}
                maxFontMm={PAWN_NAME_MAX_MM}
                minFontMm={2}
                wrap="words"
                font="heading"
                align="center"
                valign="middle"
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
