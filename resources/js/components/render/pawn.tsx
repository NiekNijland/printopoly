import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { THEMES } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { FitText } from './fit-text';
import { PhotoSlot } from './photo-slot';
import { Abs, Sheet, useRender, type ElementProps } from './sheet';

/** Unfolded pawn: front, back (upside down, so it stands when folded) and an insertion foot. */
export const PAWN_SIZE_MM = { w: 40, h: 55 } as const;

const PANEL_HEIGHT = 22.5;

export interface PawnSheetItemProps extends ElementProps {
    name: string;
    photo?: PhotoSource;
    placeholder?: boolean;
}

function PawnFace({ name, photo, placeholder }: { name: string; photo?: PhotoSource; placeholder: boolean }) {
    const { w } = PAWN_SIZE_MM;

    return (
        <>
            <PhotoSlot x={4} y={3} w={w - 8} h={13} photo={photo} placeholder={placeholder ? '#CFC6B2' : undefined} />
            <FitText
                text={name}
                x={3}
                y={16.5}
                w={w - 6}
                h={5.5}
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
export function PawnSheetItem({ name, photo, placeholder = false, ...element }: PawnSheetItemProps) {
    const { w, h } = PAWN_SIZE_MM;
    const theme = THEMES[element.theme];

    return (
        <Sheet {...element} element="pawn" widthMm={w} heightMm={h} background={theme.paper}>
            <Abs x={0} y={0} w={w} h={PANEL_HEIGHT}>
                <PawnFace name={name} photo={photo} placeholder={placeholder} />
            </Abs>
            <Abs x={0} y={PANEL_HEIGHT} w={w} h={PANEL_HEIGHT} style={{ transform: 'rotate(180deg)' }} slot="back">
                <PawnFace name={name} photo={photo} placeholder={placeholder} />
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
                style={{ position: 'absolute', left: 0, top: 0, width: mm(w), height: mm(h) }}
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
                color={theme.line}
            />
        </>
    );
}
