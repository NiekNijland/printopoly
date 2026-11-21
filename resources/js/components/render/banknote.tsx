import { useId, type ReactNode } from 'react';

import { standardEdition } from '@/lib/game/standard-edition';
import {
    cached,
    hatch,
    noteIcons,
    noteInk,
    notePaperLight,
    ringField,
    rosette,
    scallopBand,
    type NoteIconName,
    type PatternDensity,
    type Rect,
} from '@/lib/render/banknote-pattern';
import { mix, withAlpha } from '@/lib/render/color';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { mm } from '@/lib/render/units';

import { FitText } from './fit-text';
import { PhotoSlot, isFullPhoto } from './photo-slot';
import { Abs, Frame, Sheet, useRender, type ElementProps } from './sheet';

/** Play money notes (B101): 130 x 60 mm, own frame instead of bleed. */
export const BANKNOTE_SIZE_MM = { w: 130, h: 60 } as const;

export interface BanknoteProps extends ElementProps {
    value: number;
    /** Paper colour of the note; defaults to the colour of this value in the game data. */
    color?: string;
    /** Name of the bank, the same on every note; "Speelgeld" without one. */
    bankName?: string;
    /** Name of the edition, on the dark strip at the end of the note; "Speelgeld" without one. */
    editionName?: string;
    photo?: PhotoSource;
}

/** The standard colour of a note value, from the game data. */
export function noteColor(value: number): string {
    return (
        standardEdition.money.notes.find((note) => note.value === value)
            ?.color ?? '#FFFDF7'
    );
}

/**
 * Layout of the note face (B137), after the original play money: a double frame with a
 * scalloped band between, a guilloche field, an oval with the value in the middle, value
 * boxes in two corners and icons in the other two, and a dark strip with the edition name.
 */
const NOTE_LAYOUT = {
    outerInset: 2.5,
    innerInset: 4.6,
    field: { x: 4.6, y: 4.6, w: 120.8, h: 50.8 },
    strip: { x: 109, y: 4.6, w: 11, h: 50.8 },
    oval: { cx: 56.8, cy: 30, rx: 25, ry: 17.5 },
    valueBoxes: [
        {
            box: { x: 8, y: 7.5, w: 14, h: 11 },
            hatch: { x: 22, y: 7.5, w: 4, h: 11 },
        },
        {
            box: { x: 91.6, y: 41.5, w: 14, h: 11 },
            hatch: { x: 87.6, y: 41.5, w: 4, h: 11 },
        },
    ],
    iconBoxes: [
        {
            box: { x: 94.6, y: 7.5, w: 11, h: 11 },
            hatch: { x: 94.6, y: 18.5, w: 11, h: 2.6 },
        },
        {
            box: { x: 8, y: 41.5, w: 11, h: 11 },
            hatch: { x: 8, y: 38.9, w: 11, h: 2.6 },
        },
    ],
} as const;

/** A banknote of play money. It always shows the word "speelgeld" or "play money" (B85). */
export function Banknote({
    value,
    color,
    bankName,
    editionName,
    photo,
    ...element
}: BanknoteProps) {
    const paper = color ?? noteColor(value);

    return (
        <Sheet
            {...element}
            element="banknote"
            widthMm={BANKNOTE_SIZE_MM.w}
            heightMm={BANKNOTE_SIZE_MM.h}
            background={paper}
        >
            <NoteFace
                value={value}
                paper={paper}
                bankName={bankName}
                editionName={editionName}
                photo={photo}
            />
        </Sheet>
    );
}

function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function NoteFace({
    value,
    paper,
    bankName,
    editionName,
    photo,
}: {
    value: number;
    paper: string;
    bankName?: string;
    editionName?: string;
    photo?: PhotoSource;
}) {
    const { theme, locale, money, words } = useRender();
    const clipId = `note-field-${useId().replace(/:/g, '')}`;
    const { w, h } = BANKNOTE_SIZE_MM;
    const { field, strip, oval } = NOTE_LAYOUT;
    const t = STRINGS[locale];
    const ink = noteInk(paper, theme.ink);
    const light = notePaperLight(paper, theme.paper);
    const density: PatternDensity = theme.id === 'strak' ? 'light' : 'full';
    const riso = theme.id === 'riso';
    // Riso prints the guilloche in its second drum, slightly off register (B84).
    const patternInk = riso ? theme.accent : ink;
    const full = isFullPhoto(photo);
    const framed = photo !== undefined && !full;
    const bank =
        bankName !== undefined && bankName.trim() !== ''
            ? bankName
            : capitalize(t.playMoney);
    const hasEdition = editionName !== undefined && editionName.trim() !== '';
    const noteName =
        words.noteName !== undefined && words.noteName.trim() !== ''
            ? words.noteName
            : t.playMoney;
    const [firstIcon, secondIcon] = noteIcons(value);
    const icons: NoteIconName[] = [firstIcon, secondIcon];

    const rings = cached(`rings:${density}`, () =>
        ringField(field, density, { ellipse: oval, rects: [strip] }),
    );
    const band = cached('band', () =>
        scallopBand(
            {
                x: NOTE_LAYOUT.innerInset - 0.25,
                y: NOTE_LAYOUT.innerInset - 0.25,
                w: w - 2 * (NOTE_LAYOUT.innerInset - 0.25),
                h: h - 2 * (NOTE_LAYOUT.innerInset - 0.25),
            },
            0.45,
        ),
    );
    const rosettes = cached('rosette', () =>
        [0, Math.PI / 18]
            .map((phase) =>
                rosette(oval.cx, oval.cy, oval.rx + 9, oval.ry + 6, phase),
            )
            .join(''),
    );
    const hatchGap = density === 'full' ? 0.7 : 1.2;
    const hatches = cached(`hatch:${density}`, () =>
        [...NOTE_LAYOUT.valueBoxes, ...NOTE_LAYOUT.iconBoxes]
            .map((corner) => hatch(corner.hatch, hatchGap))
            .join(''),
    );
    const lineMm = density === 'full' ? 0.09 : 0.08;

    return (
        <>
            {full && (
                <>
                    <PhotoSlot
                        x={field.x}
                        y={field.y}
                        w={field.w}
                        h={field.h}
                        photo={photo}
                    />
                    {/* The pattern stays on top of a lightened photo (B137). */}
                    <Abs
                        x={field.x}
                        y={field.y}
                        w={field.w}
                        h={field.h}
                        style={{ background: withAlpha(light, 0.55) }}
                        slot="photo-wash"
                    />
                </>
            )}
            <NoteSvg slot="guilloche" offset={riso}>
                <defs>
                    <clipPath id={clipId}>
                        <rect
                            x={field.x}
                            y={field.y}
                            width={field.w}
                            height={field.h}
                        />
                    </clipPath>
                </defs>
                <g fill="none" stroke={patternInk} strokeWidth={lineMm}>
                    <path
                        d={rings}
                        clipPath={`url(#${clipId})`}
                        stroke={tint(patternInk, paper, riso ? 0.4 : 0.5)}
                        data-pattern="rings"
                    />
                    {density === 'full' && (
                        <path
                            d={rosettes}
                            clipPath={`url(#${clipId})`}
                            stroke={tint(patternInk, paper, 0.3)}
                            data-pattern="rosette"
                        />
                    )}
                    {density === 'full' && (
                        <path d={band} strokeWidth={0.15} data-pattern="band" />
                    )}
                </g>
            </NoteSvg>
            <Frame
                x={NOTE_LAYOUT.outerInset}
                y={NOTE_LAYOUT.outerInset}
                w={w - 2 * NOTE_LAYOUT.outerInset}
                h={h - 2 * NOTE_LAYOUT.outerInset}
                color={ink}
                strokeMm={theme.frameMm + 0.15}
            />
            <Frame
                x={NOTE_LAYOUT.innerInset}
                y={NOTE_LAYOUT.innerInset}
                w={w - 2 * NOTE_LAYOUT.innerInset}
                h={h - 2 * NOTE_LAYOUT.innerInset}
                color={ink}
                strokeMm={0.25}
            />
            <NoteSvg slot="ornaments">
                <ellipse
                    cx={oval.cx}
                    cy={oval.cy}
                    rx={oval.rx}
                    ry={oval.ry}
                    fill={light}
                    stroke={ink}
                    strokeWidth={0.5}
                    data-oval=""
                />
                <ellipse
                    cx={oval.cx}
                    cy={oval.cy}
                    rx={oval.rx - 1}
                    ry={oval.ry - 1}
                    fill="none"
                    stroke={ink}
                    strokeWidth={0.18}
                />
                <path d={hatches} fill="none" stroke={ink} strokeWidth={0.12} />
                {[...NOTE_LAYOUT.valueBoxes, ...NOTE_LAYOUT.iconBoxes].map(
                    (corner) => (
                        <g key={`${corner.box.x}-${corner.box.y}`}>
                            <rect
                                x={corner.hatch.x}
                                y={corner.hatch.y}
                                width={corner.hatch.w}
                                height={corner.hatch.h}
                                fill="none"
                                stroke={ink}
                                strokeWidth={0.2}
                            />
                            <rect
                                x={corner.box.x}
                                y={corner.box.y}
                                width={corner.box.w}
                                height={corner.box.h}
                                fill={light}
                                stroke={ink}
                                strokeWidth={0.35}
                                data-corner=""
                            />
                        </g>
                    ),
                )}
                {NOTE_LAYOUT.iconBoxes.map((corner, index) => (
                    <NoteIcon
                        key={icons[index]}
                        name={icons[index] as NoteIconName}
                        box={corner.box}
                        ink={ink}
                        light={light}
                    />
                ))}
            </NoteSvg>
            {framed && (
                <Abs
                    x={oval.cx - oval.rx + 1.3}
                    y={oval.cy - oval.ry + 1.3}
                    w={2 * (oval.rx - 1.3)}
                    h={2 * (oval.ry - 1.3)}
                    style={{ borderRadius: '50%', overflow: 'hidden' }}
                    slot="oval-photo"
                >
                    <PhotoSlot
                        x={0}
                        y={0}
                        w={2 * (oval.rx - 1.3)}
                        h={2 * (oval.ry - 1.3)}
                        photo={photo}
                    />
                </Abs>
            )}
            {framed ? (
                <>
                    <Abs
                        x={oval.cx - 15}
                        y={oval.cy + oval.ry - 7}
                        w={30}
                        h={9}
                        style={{
                            background: light,
                            border: `0.35mm solid ${ink}`,
                            borderRadius: mm(4.5),
                            boxSizing: 'border-box',
                        }}
                    />
                    <FitText
                        text={money(value)}
                        x={oval.cx - 13}
                        y={oval.cy + oval.ry - 6.2}
                        w={26}
                        h={7.4}
                        maxFontMm={6.5}
                        minFontMm={3}
                        font="heading"
                        color={ink}
                        align="center"
                        slot="value"
                    />
                </>
            ) : (
                <>
                    <FitText
                        text={money(value)}
                        x={oval.cx - oval.rx + 4}
                        y={oval.cy - 12.5}
                        w={2 * oval.rx - 8}
                        h={17}
                        maxFontMm={16}
                        minFontMm={5}
                        font="heading"
                        color={ink}
                        align="center"
                        slot="value"
                    />
                    <FitText
                        text={bank}
                        x={oval.cx - oval.rx + 8}
                        y={oval.cy + 5}
                        w={2 * oval.rx - 16}
                        h={5.5}
                        maxFontMm={3.6}
                        minFontMm={1.8}
                        font="heading"
                        color={ink}
                        align="center"
                        slot="bank-name"
                    />
                </>
            )}
            {framed && (
                <FitText
                    text={bank}
                    x={oval.cx - oval.rx}
                    y={oval.cy + oval.ry + 2.2}
                    w={2 * oval.rx}
                    h={4.6}
                    maxFontMm={3.2}
                    minFontMm={1.8}
                    font="heading"
                    color={ink}
                    align="center"
                    slot="bank-name"
                />
            )}
            {NOTE_LAYOUT.valueBoxes.map((corner, index) => (
                <FitText
                    key={index}
                    text={String(value)}
                    x={corner.box.x + 1}
                    y={corner.box.y + 1}
                    w={corner.box.w - 2}
                    h={corner.box.h - 2}
                    maxFontMm={7}
                    minFontMm={3}
                    font="heading"
                    color={ink}
                    align="center"
                    slot="corner-value"
                />
            ))}
            <Abs
                x={strip.x}
                y={strip.y}
                w={strip.w}
                h={strip.h}
                style={{
                    background: riso ? theme.accent : ink,
                    // A rim of paper keeps the strip clear of the pattern around it.
                    boxShadow: `0 0 0 0.6mm ${light}`,
                }}
                slot="strip"
            >
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: mm(strip.h),
                        width: mm(strip.h),
                        height: mm(strip.w),
                        transform: 'rotate(-90deg)',
                        transformOrigin: 'top left',
                    }}
                >
                    <FitText
                        text={hasEdition ? editionName : capitalize(noteName)}
                        x={2.5}
                        y={hasEdition ? 1 : 1.5}
                        w={strip.h - 5}
                        h={hasEdition ? 6.2 : 8}
                        maxFontMm={hasEdition ? 5.5 : 6}
                        minFontMm={2}
                        font="heading"
                        color={light}
                        align="center"
                        slot="edition-name"
                    />
                    {hasEdition && (
                        <FitText
                            // An own currency ("Kus") gives the notes its name; else they say "speelgeld" (UX 4).
                            text={noteName}
                            x={2.5}
                            y={7.2}
                            w={strip.h - 5}
                            h={2.8}
                            maxFontMm={2.3}
                            minFontMm={1.6}
                            font="body"
                            weight={600}
                            color={light}
                            align="center"
                            slot="play-money"
                        />
                    )}
                </div>
            </Abs>
        </>
    );
}

/** One SVG over the whole note, in mm. */
function NoteSvg({
    slot,
    offset = false,
    children,
}: {
    slot: string;
    /** Riso: the second drum prints slightly off register. */
    offset?: boolean;
    children: ReactNode;
}) {
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
}

/** Our own small icons for the corners: house, hotel, key and die, in the ink of the note. */
function NoteIcon({
    name,
    box,
    ink,
    light,
}: {
    name: NoteIconName;
    box: Rect;
    ink: string;
    light: string;
}) {
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
}

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * A lighter line colour, mixed with the paper instead of drawn with opacity: transparency
 * makes Chrome slow on a sheet with hundreds of notes.
 */
function tint(ink: string, paper: string, amount: number): string {
    return HEX.test(ink) && HEX.test(paper) ? mix(ink, paper, amount) : ink;
}
