import { createContext, type ReactNode } from 'react';

import type { NoteIconName, Rect } from '@/lib/render/banknote-pattern';
import { mm } from '@/lib/render/units';
import type { Locale } from '@/types/game';

/*
 * What every face of a note shares (the theme's faces in banknote.tsx and the styles of B270 in
 * banknote-styles.tsx): the size, the switch to one picture per value on a print sheet, one SVG over the note in mm
 * and the corner icons.
 */

/** Play money notes (B101): 130 x 60 mm, own frame instead of bleed. */
export const BANKNOTE_SIZE_MM = { w: 130, h: 60 } as const;

/**
 * True on a print sheet: the guilloche is drawn once per value as a picture instead of as lines on every note, so
 * the money PDF stays small (bug 3 of test round 4). The editor keeps the vector lines.
 */
export const RasterNotePattern = createContext(false);

/** Pixels per mm of the guilloche picture: 20 is about 500 dpi, finer than the 0.09 mm lines. */
export const RASTER_PX_PER_MM = 20;

/** One SVG over the whole note, in mm. */
export const NoteSvg = ({
    slot,
    offset = false,
    children,
}: {
    slot: string;
    /** Riso: the second drum prints slightly off register. */
    offset?: boolean;
    children: ReactNode;
}) => {
    const { w, h } = BANKNOTE_SIZE_MM;

    return (
        <svg
            style={{
                position: 'absolute',
                left: offset ? mm(0.35) : 0,
                top: offset ? mm(0.25) : 0,
                width: mm(w),
                height: mm(h),
            }}
            viewBox={`0 0 ${w} ${h}`}
            aria-hidden="true"
            data-slot={slot}
        >
            {children}
        </svg>
    );
};

/** Our own small icons for the corners: house, hotel, key and die, in the ink of the note. */
export const NoteIcon = ({
    name,
    box,
    ink,
    light,
}: {
    name: NoteIconName;
    box: Rect;
    ink: string;
    light: string;
}) => {
    const size = Math.min(box.w, box.h) - 3;
    const x = box.x + (box.w - size) / 2;
    const y = box.y + (box.h - size) / 2;

    return (
        <g
            transform={`translate(${x} ${y}) scale(${size / 20})`}
            data-note-icon={name}
        >
            {name === 'house' && (
                <>
                    <path d="M2 9.5L10 2.5L18 9.5V18H2Z" fill={ink} />
                    <path d="M8.2 18V12.5H11.8V18Z" fill={light} />
                </>
            )}
            {name === 'hotel' && (
                <>
                    <path d="M1 8L10 3L19 8V18H1Z" fill={ink} />
                    {[4, 8.5, 13].map((wx) => (
                        <rect
                            key={wx}
                            x={wx}
                            y={9.5}
                            width={3}
                            height={2.6}
                            fill={light}
                        />
                    ))}
                    <path d="M8.5 18V14H11.5V18Z" fill={light} />
                </>
            )}
            {name === 'key' && (
                <g
                    fill="none"
                    stroke={ink}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                >
                    <circle cx={6} cy={10} r={3.6} />
                    <path d="M9.6 10H18.5M15.5 10V13.5M18.5 10V12.5" />
                </g>
            )}
            {name === 'die' && (
                <>
                    <rect
                        x={2}
                        y={2}
                        width={16}
                        height={16}
                        rx={3}
                        fill={ink}
                    />
                    {[
                        [6, 6],
                        [14, 6],
                        [10, 10],
                        [6, 14],
                        [14, 14],
                    ].map(([cx, cy]) => (
                        <circle
                            key={`${cx}-${cy}`}
                            cx={cx}
                            cy={cy}
                            r={1.6}
                            fill={light}
                        />
                    ))}
                </>
            )}
        </g>
    );
};

/**
 * The value of a standard note in words ("honderd"), for the line under the amount when the bank has no name of its
 * own: that line used to say "Speelgeld", which the note already says elsewhere (B85, B270).
 */
const VALUE_WORDS: Record<Locale, Record<number, string>> = {
    nl: {
        1: 'een',
        5: 'vijf',
        10: 'tien',
        20: 'twintig',
        50: 'vijftig',
        100: 'honderd',
        500: 'vijfhonderd',
    },
    en: {
        1: 'one',
        5: 'five',
        10: 'ten',
        20: 'twenty',
        50: 'fifty',
        100: 'one hundred',
        500: 'five hundred',
    },
};

export const valueInWords = (value: number, locale: Locale): string => {
    return VALUE_WORDS[locale][value] ?? '';
};
