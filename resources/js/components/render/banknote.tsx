import { createContext, useContext, useId, type ReactNode } from 'react';

import { standardEdition } from '@/lib/game/standard-edition';
import {
    cached,
    hatch,
    noteIcons,
    noteInk,
    notePaperLight,
    rasterPattern,
    ringField,
    rosette,
    scallopBand,
    type NoteIconName,
    type PatternDensity,
    type Rect,
} from '@/lib/render/banknote-pattern';
import { mix, readableOn, withAlpha } from '@/lib/render/color';
import { NOTE_NAME_BOX } from '@/lib/render/name-boxes';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { mm } from '@/lib/render/units';

import { FitText } from './fit-text';
import { PhotoSlot, isFullPhoto } from './photo-slot';
import { Abs, Frame, Sheet, useRender, type ElementProps } from './sheet';

/** Play money notes (B101): 130 x 60 mm, own frame instead of bleed. */
export const BANKNOTE_SIZE_MM = { w: 130, h: 60 } as const;

/**
 * True on a print sheet: the guilloche is drawn once per value as a picture instead of as lines on every note, so
 * the money PDF stays small (bug 3 of test round 4). The editor keeps the vector lines.
 */
export const RasterNotePattern = createContext(false);

/** Pixels per mm of the guilloche picture: 20 is about 500 dpi, finer than the 0.09 mm lines. */
const RASTER_PX_PER_MM = 20;

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
    // Strak prints flat and typographic: white paper with the colour of the value as one block (Tom, B255).
    const plain = element.theme === 'strak';

    return (
        <Sheet
            {...element}
            element="banknote"
            widthMm={BANKNOTE_SIZE_MM.w}
            heightMm={BANKNOTE_SIZE_MM.h}
            background={plain ? '#FFFFFF' : paper}
        >
            {plain ? (
                <PlainNoteFace
                    value={value}
                    color={paper}
                    bankName={bankName}
                    editionName={editionName}
                    photo={photo}
                />
            ) : (
                <NoteFace
                    value={value}
                    paper={paper}
                    bankName={bankName}
                    editionName={editionName}
                    photo={photo}
                />
            )}
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
    // Riso prints the guilloche in its second drum, slightly off register (B84); Gala prints it in gold (B247).
    const patternInk = riso || theme.id === 'gala' ? theme.accent : ink;
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
    const ringColor = tint(patternInk, paper, riso ? 0.4 : 0.5);
    const rosetteColor = tint(patternInk, paper, 0.3);
    // On a print sheet the line work is one picture per value, so the PDF holds it once (bug 3 of test round 4).
    const raster = useContext(RasterNotePattern)
        ? rasterPattern(
              [density, patternInk, paper, full ? 'photo' : 'paper'].join('|'),
              {
                  w,
                  h,
                  clip: field,
                  clipped: [
                      { d: rings, color: ringColor },
                      ...(density === 'full'
                          ? [{ d: rosettes, color: rosetteColor }]
                          : []),
                  ],
                  free:
                      density === 'full'
                          ? [{ d: band, color: patternInk, widthMm: 0.15 }]
                          : [],
                  lineMm,
                  // Under a photo the picture stays clear, so the lightened photo shows through.
                  background: full ? null : paper,
                  density: RASTER_PX_PER_MM,
              },
          )
        : null;

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
            {raster !== null ? (
                <img
                    src={raster}
                    alt=""
                    aria-hidden="true"
                    data-slot="guilloche"
                    data-raster=""
                    style={{
                        position: 'absolute',
                        left: riso ? mm(0.35) : 0,
                        top: riso ? mm(0.25) : 0,
                        width: mm(w),
                        height: mm(h),
                        maxWidth: 'none',
                    }}
                />
            ) : (
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
                            stroke={ringColor}
                            data-pattern="rings"
                        />
                        {density === 'full' && (
                            <path
                                d={rosettes}
                                clipPath={`url(#${clipId})`}
                                stroke={rosetteColor}
                                data-pattern="rosette"
                            />
                        )}
                        {density === 'full' && (
                            <path
                                d={band}
                                strokeWidth={0.15}
                                data-pattern="band"
                            />
                        )}
                    </g>
                </NoteSvg>
            )}
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
                        minFontMm={1.6}
                        wrap="words"
                        lineHeight={1.05}
                        font="heading"
                        color={ink}
                        align="center"
                        slot="bank-name"
                        clip
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
                    minFontMm={1.6}
                    wrap="words"
                    lineHeight={1.05}
                    font="heading"
                    color={ink}
                    align="center"
                    slot="bank-name"
                    clip
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
                        minFontMm={NOTE_NAME_BOX.minFontMm}
                        wrap="words"
                        lineHeight={NOTE_NAME_BOX.lineHeight}
                        font="heading"
                        color={light}
                        align="center"
                        slot="edition-name"
                        clip
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

/** Where the parts of a Strak note go, in mm (B255). */
const PLAIN = {
    inset: 2.5,
    block: { x: 2.5, y: 2.5, w: 36, h: 55 },
    text: { x: 44, w: 80 },
    photo: { x: 96, y: 6, w: 28, h: 30 },
} as const;

/**
 * The Strak note (B255): no guilloche, ornaments or icons. White paper in a thin ink frame, the colour of the value
 * as one block on the left with the number, and on the right the bank, the amount and the name of the edition in
 * plain type, like a ticket. A photo goes in the block (whole note) or in a frame top right.
 */
function PlainNoteFace({
    value,
    color,
    bankName,
    editionName,
    photo,
}: {
    value: number;
    color: string;
    bankName?: string;
    editionName?: string;
    photo?: PhotoSource;
}) {
    const { theme, locale, money, words } = useRender();
    const { w, h } = BANKNOTE_SIZE_MM;
    const { block, text } = PLAIN;
    const t = STRINGS[locale];
    const ink = theme.ink;
    const full = isFullPhoto(photo);
    const framed = photo !== undefined && !full;
    const numberInk = readableOn(color);
    const bank =
        bankName !== undefined && bankName.trim() !== ''
            ? bankName
            : capitalize(t.playMoney);
    const noteName =
        words.noteName !== undefined && words.noteName.trim() !== ''
            ? words.noteName
            : t.playMoney;
    const hasEdition = editionName !== undefined && editionName.trim() !== '';
    const amountW = framed ? PLAIN.photo.x - text.x - 3 : text.w;

    return (
        <>
            {full ? (
                <PhotoSlot
                    x={block.x}
                    y={block.y}
                    w={block.w}
                    h={block.h}
                    photo={photo}
                />
            ) : (
                <Abs
                    x={block.x}
                    y={block.y}
                    w={block.w}
                    h={block.h}
                    style={{ background: color }}
                    slot="value-block"
                />
            )}
            {framed && (
                <>
                    <PhotoSlot
                        x={PLAIN.photo.x}
                        y={PLAIN.photo.y}
                        w={PLAIN.photo.w}
                        h={PLAIN.photo.h}
                        photo={photo}
                    />
                    <Frame
                        x={PLAIN.photo.x}
                        y={PLAIN.photo.y}
                        w={PLAIN.photo.w}
                        h={PLAIN.photo.h}
                        color={ink}
                        strokeMm={0.25}
                    />
                </>
            )}
            <Frame
                x={PLAIN.inset}
                y={PLAIN.inset}
                w={w - 2 * PLAIN.inset}
                h={h - 2 * PLAIN.inset}
                color={ink}
                strokeMm={0.3}
            />
            {full ? (
                <>
                    <Abs
                        x={block.x}
                        y={block.y + block.h - 13}
                        w={block.w}
                        h={13}
                        style={{ background: color }}
                    />
                    <FitText
                        text={String(value)}
                        x={block.x + 2}
                        y={block.y + block.h - 12}
                        w={block.w - 4}
                        h={11}
                        maxFontMm={10}
                        minFontMm={3}
                        font="heading"
                        color={numberInk}
                        align="left"
                        slot="corner-value"
                    />
                </>
            ) : (
                <FitText
                    text={String(value)}
                    x={block.x + 3}
                    y={block.y + 3}
                    w={block.w - 6}
                    h={block.h - 6}
                    maxFontMm={24}
                    minFontMm={4}
                    font="heading"
                    color={numberInk}
                    align="left"
                    valign="bottom"
                    lineHeight={0.9}
                    slot="corner-value"
                />
            )}
            <FitText
                text={bank}
                x={text.x}
                y={6.5}
                w={amountW}
                h={4.5}
                maxFontMm={3.4}
                minFontMm={1.6}
                font="body"
                weight={600}
                color={ink}
                align="left"
                slot="bank-name"
                clip
            />
            <FitText
                text={money(value)}
                x={text.x}
                y={14}
                w={amountW}
                h={20}
                maxFontMm={17}
                minFontMm={5}
                font="heading"
                color={ink}
                align="left"
                slot="value"
            />
            <Abs
                x={text.x}
                y={h - 16}
                w={text.w}
                h={0.25}
                style={{ background: ink }}
            />
            <FitText
                text={hasEdition ? editionName : capitalize(noteName)}
                x={text.x}
                y={h - 14}
                w={text.w - 24}
                h={8}
                maxFontMm={4.6}
                minFontMm={NOTE_NAME_BOX.minFontMm}
                wrap="words"
                lineHeight={NOTE_NAME_BOX.lineHeight}
                font="heading"
                color={ink}
                align="left"
                slot="edition-name"
                clip
            />
            {hasEdition && (
                <FitText
                    text={noteName}
                    x={text.x + text.w - 24}
                    y={h - 14}
                    w={24}
                    h={8}
                    maxFontMm={2.6}
                    minFontMm={1.6}
                    font="body"
                    weight={600}
                    color={ink}
                    align="right"
                    slot="play-money"
                />
            )}
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
