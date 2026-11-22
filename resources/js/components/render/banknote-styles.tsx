import { useContext, useId } from 'react';

import type { MoneyStyle } from '@/lib/edition/part-styles';
import {
    bumpyCircle,
    cornerBlocks,
    cutCornerBox,
    ellipsePath,
    latheRosette,
    notchedBanner,
    ropeBand,
    waveNet,
} from '@/lib/render/banknote-guilloche';
import {
    cached,
    hatch,
    noteIcons,
    noteInk,
    notePaperLight,
    rasterPattern,
    type NoteIconName,
    type Rect,
} from '@/lib/render/banknote-pattern';
import { mix, readableOn, withAlpha } from '@/lib/render/color';
import { NOTE_NAME_BOX } from '@/lib/render/name-boxes';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { PLAYFAIR, SPARTAN, type Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import {
    BANKNOTE_SIZE_MM,
    NoteIcon,
    valueInWords,
    NoteSvg,
    RASTER_PX_PER_MM,
    RasterNotePattern,
} from './banknote-parts';
import { FitText } from './fit-text';
import { PhotoSlot, isFullPhoto } from './photo-slot';
import { Abs, useRender } from './sheet';

/**
 * The styles of the money (B270, Niek, feedback 22 nov), on top of the theme like the board styles (B268). Every
 * style keeps the paper colour of each value (B85) and the inks of the theme, uses only the fonts the print page
 * loads (Playfair Display 700, League Spartan 800, Instrument Sans) and keeps what print and checks rely on: the
 * amount with the currency (`value`), the value in the corners (`corner-value`), the bank (`bank-name`), the edition
 * (`edition-name`) and "speelgeld" or the own currency (`play-money`). The frame line runs 4.6 mm inside the edge in
 * every style, so the set mark (B242) sits on it as on the theme's note.
 *
 * - Vintage: an engraved note. A twisted rope between two rules with a rosette block in each corner, a woven net of
 *   waves, two lathe rosettes and a rosette ring round a beaded oval with the amount in Playfair, four cut-corner
 *   cartouches with the value and a notched banner with the name of the edition.
 * - Modern: flat. The colour of the value is the field, a quarter disc in a shade of it, the value huge in League
 *   Spartan and a light panel with the bank, the amount and the edition.
 * - Speels: rounded. A polka-dot field in a rounded frame, the amount on a wavy badge with a sticker shadow, the
 *   value and two icons in round bubbles, the edition on a tilted pill and some confetti.
 */
export interface StyledNoteProps {
    value: number;
    paper: string;
    bankName?: string;
    editionName?: string;
    photo?: PhotoSource;
}

export function StyledNoteFace({
    style,
    ...props
}: StyledNoteProps & { style: MoneyStyle }) {
    switch (style) {
        case 'vintage':
            return <VintageNoteFace {...props} />;
        case 'modern':
            return <ModernNoteFace {...props} />;
        case 'playful':
            return <PlayfulNoteFace {...props} />;
    }
}

const { w: NOTE_W, h: NOTE_H } = BANKNOTE_SIZE_MM;

/** The frame line of every style: the set mark sits on its bottom edge (`NOTE_MARK` in item-art.tsx). */
const FRAME_INSET = 4.6;

function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The words of a note. "Speelgeld" (or the own currency, B172) is on every note once (B85): on the plate or pill
 * under the edition name, or as the big name without one. The line under the amount names the bank when the
 * edition gave it a name; otherwise it spells out the value ("HONDERD"), so "speelgeld" is not there twice.
 */
function useNoteWords(value: number, bankName?: string, editionName?: string) {
    const { locale, words, money } = useRender();
    const t = STRINGS[locale];
    const noteName =
        words.noteName !== undefined && words.noteName.trim() !== ''
            ? words.noteName
            : t.playMoney;
    const hasEdition = editionName !== undefined && editionName.trim() !== '';
    const ownBank = bankName !== undefined && bankName.trim() !== '';

    return {
        money,
        bank: ownBank ? bankName : capitalize(valueInWords(value, locale)),
        /** The slot of that line: the checks read `bank-name` only where it holds the bank. */
        bankSlot: ownBank ? 'bank-name' : 'value-words',
        noteName,
        hasEdition,
        /** The big name on the note: the edition, or "Speelgeld" (the own currency) without one. */
        title: hasEdition ? (editionName ?? '') : capitalize(noteName),
    };
}

/** One dark ink per note: a deep shade of its paper like the original money, black in Strak (B255). */
function inkOf(theme: Theme, paper: string): string {
    return theme.id === 'strak' ? theme.ink : noteInk(paper, theme.ink);
}

const HEX = /^#[0-9a-f]{6}$/i;

/** A lighter line, mixed with the paper instead of drawn with opacity (opacity makes a sheet of notes slow). */
function tint(ink: string, paper: string, amount: number): string {
    return HEX.test(ink) && HEX.test(paper) ? mix(ink, paper, amount) : ink;
}

/** A full photo behind the field, lightened so the line work and the text stay on top (as B137). */
function FullPhoto({
    field,
    photo,
    light,
    radius = 0,
}: {
    field: Rect;
    photo: PhotoSource | undefined;
    light: string;
    radius?: number;
}) {
    return (
        <Abs
            x={field.x}
            y={field.y}
            w={field.w}
            h={field.h}
            style={{ borderRadius: mm(radius), overflow: 'hidden' }}
        >
            <PhotoSlot x={0} y={0} w={field.w} h={field.h} photo={photo} />
            <Abs
                x={0}
                y={0}
                w={field.w}
                h={field.h}
                style={{ background: withAlpha(light, 0.55) }}
                slot="photo-wash"
            />
        </Abs>
    );
}

/* ------------------------------------------------------------------------------------------------------------ */
/* Vintage                                                                                                        */
/* ------------------------------------------------------------------------------------------------------------ */

const VINTAGE = {
    outer: 2.2,
    /** Centre line of the rope band, between the outer rule and the inner rules. */
    band: 3.4,
    inner: FRAME_INSET,
    hairline: 5.2,
    field: { x: 5.2, y: 5.2, w: NOTE_W - 10.4, h: NOTE_H - 10.4 },
    banner: { x: 33, y: 7.2, w: 64, h: 6.6 },
    oval: { cx: 65, cy: 30.5, rx: 23.5, ry: 14 },
    medallions: [
        { cx: 24, cy: 30.5 },
        { cx: 106, cy: 30.5 },
    ],
    plaque: { x: 46, y: 48.2, w: 38, h: 4.4 },
    corners: [
        {
            box: { x: 8, y: 8, w: 15, h: 9.5 },
            tab: { x: 23, y: 8, w: 3.4, h: 9.5 },
        },
        {
            box: { x: 107, y: 8, w: 15, h: 9.5 },
            tab: { x: 103.6, y: 8, w: 3.4, h: 9.5 },
        },
        {
            box: { x: 8, y: 42.5, w: 15, h: 9.5 },
            tab: { x: 23, y: 42.5, w: 3.4, h: 9.5 },
        },
        {
            box: { x: 107, y: 42.5, w: 15, h: 9.5 },
            tab: { x: 103.6, y: 42.5, w: 3.4, h: 9.5 },
        },
    ],
} as const;

/** The pearls round the oval. A dash pattern in a PDF becomes one shape per dot, so on paper they are in the picture. */
const BEAD = { width: 0.45, dash: [0, 0.85] } as const;

/** Whether a point lies well inside a filled shape of a Vintage note (the oval, the banner, a cartouche). */
function vintageCovers(x: number, y: number): boolean {
    const { oval, banner, corners } = VINTAGE;
    const inside = (r: Rect) =>
        x > r.x + 0.8 &&
        x < r.x + r.w - 0.8 &&
        y > r.y + 0.8 &&
        y < r.y + r.h - 0.8;

    return (
        ((x - oval.cx) / (oval.rx - 1)) ** 2 +
            ((y - oval.cy) / (oval.ry - 1)) ** 2 <
            1 ||
        inside(banner) ||
        corners.some((corner) => inside(corner.box))
    );
}

/** The line work of a Vintage note, the same for every value: cached once per page. */
function vintageLines() {
    const { field, oval, medallions, band, corners } = VINTAGE;
    const bandRect = {
        x: band,
        y: band,
        w: NOTE_W - 2 * band,
        h: NOTE_H - 2 * band,
    };

    return {
        net: cached('vintage:net', () =>
            waveNet(field, { gap: 2.2, amp: 1.05, period: 7.5 }, (x, y) =>
                vintageCovers(x, y),
            ),
        ),
        rosettes: cached('vintage:rosettes', () =>
            [
                ...medallions.map((m) =>
                    latheRosette({
                        ...m,
                        inner: 1.6,
                        outer: 9.2,
                        rings: 8,
                        lobes: 14,
                        amp: 0.5,
                        twist: 0.55,
                    }),
                ),
                latheRosette({
                    cx: oval.cx,
                    cy: oval.cy,
                    inner: oval.ry + 1.9,
                    outer: oval.ry + 5.4,
                    rings: 7,
                    lobes: 44,
                    amp: 0.55,
                    twist: 0.45,
                    stretch: oval.rx / oval.ry,
                }),
            ].join(''),
        ),
        rope: cached('vintage:rope', () =>
            ropeBand(bandRect, {
                amp: 0.5,
                period: 2.4,
                strands: 3,
                corner: 1.2,
            }),
        ),
        blocks: cached('vintage:blocks', () => cornerBlocks(bandRect, 2.4)),
        // A ring of pearls just outside the oval: dots with round caps, in the line work.
        beads: cached('vintage:beads', () =>
            ellipsePath(oval.cx, oval.cy, oval.rx + 1, oval.ry + 1),
        ),
        // The hatched tabs beside the cartouches, with their outline: line work too, so they print in the picture.
        hatches: cached('vintage:hatch', () =>
            corners
                .map(
                    ({ tab }) =>
                        hatch(tab, 0.6) +
                        `M${tab.x} ${tab.y}h${tab.w}v${tab.h}h${-tab.w}Z`,
                )
                .join(''),
        ),
    };
}

function VintageNoteFace({
    value,
    paper,
    bankName,
    editionName,
    photo,
}: StyledNoteProps) {
    const { theme } = useRender();
    const clipId = `note-vintage-${useId().replace(/:/g, '')}`;
    const { field, banner, oval, plaque, corners } = VINTAGE;
    const { money, bank, bankSlot, noteName, hasEdition, title } = useNoteWords(
        value,
        bankName,
        editionName,
    );
    const ink = inkOf(theme, paper);
    const light = notePaperLight(paper, theme.paper);
    const riso = theme.id === 'riso';
    // As on the theme's note: Riso prints the line work in its second drum, Gala in gold (B84, B247).
    const patternInk = riso || theme.id === 'gala' ? theme.accent : ink;
    const full = isFullPhoto(photo);
    const framed = photo !== undefined && !full;
    const lines = vintageLines();
    const lineMm = 0.09;
    const netColor = tint(patternInk, paper, 0.55);
    const rosetteColor = tint(patternInk, paper, 0.25);
    const raster = useContext(RasterNotePattern)
        ? rasterPattern(
              ['vintage', patternInk, paper, full ? 'photo' : 'paper'].join(
                  '|',
              ),
              {
                  w: NOTE_W,
                  h: NOTE_H,
                  clip: field,
                  clipped: [
                      { d: lines.net, color: netColor },
                      { d: lines.rosettes, color: rosetteColor },
                  ],
                  free: [
                      { d: lines.rope, color: patternInk, widthMm: 0.13 },
                      { d: lines.blocks, color: patternInk, widthMm: 0.14 },
                      { d: lines.hatches, color: patternInk, widthMm: 0.13 },
                      {
                          d: lines.beads,
                          color: patternInk,
                          widthMm: BEAD.width,
                          dash: BEAD.dash,
                      },
                  ],
                  lineMm,
                  background: full ? null : paper,
                  density: RASTER_PX_PER_MM,
              },
          )
        : null;
    const bannerD = notchedBanner(banner, 1.9);

    return (
        <>
            {full && <FullPhoto field={field} photo={photo} light={light} />}
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
                        width: mm(NOTE_W),
                        height: mm(NOTE_H),
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
                    <g fill="none" strokeWidth={lineMm}>
                        <path
                            d={lines.net}
                            clipPath={`url(#${clipId})`}
                            stroke={netColor}
                            data-pattern="net"
                        />
                        <path
                            d={lines.rosettes}
                            clipPath={`url(#${clipId})`}
                            stroke={rosetteColor}
                            data-pattern="rosette"
                        />
                        <path
                            d={lines.rope}
                            stroke={patternInk}
                            strokeWidth={0.13}
                            data-pattern="rope"
                        />
                        <path
                            d={lines.blocks}
                            stroke={patternInk}
                            strokeWidth={0.14}
                        />
                        <path
                            d={lines.hatches}
                            stroke={patternInk}
                            strokeWidth={0.13}
                            data-pattern="hatch"
                        />
                        <path
                            d={lines.beads}
                            stroke={patternInk}
                            strokeWidth={BEAD.width}
                            strokeLinecap="round"
                            strokeDasharray={BEAD.dash.join(' ')}
                            data-slot="beads"
                        />
                    </g>
                </NoteSvg>
            )}
            <NoteSvg slot="ornaments">
                <g fill="none" stroke={ink}>
                    <rect
                        x={VINTAGE.outer}
                        y={VINTAGE.outer}
                        width={NOTE_W - 2 * VINTAGE.outer}
                        height={NOTE_H - 2 * VINTAGE.outer}
                        strokeWidth={0.4}
                        data-frame=""
                    />
                    <rect
                        x={VINTAGE.inner}
                        y={VINTAGE.inner}
                        width={NOTE_W - 2 * VINTAGE.inner}
                        height={NOTE_H - 2 * VINTAGE.inner}
                        strokeWidth={0.3}
                        data-frame=""
                    />
                    <rect
                        x={VINTAGE.hairline}
                        y={VINTAGE.hairline}
                        width={NOTE_W - 2 * VINTAGE.hairline}
                        height={NOTE_H - 2 * VINTAGE.hairline}
                        strokeWidth={0.12}
                    />
                </g>
                <path
                    d={ellipsePath(oval.cx, oval.cy, oval.rx, oval.ry)}
                    fill={light}
                    stroke={ink}
                    strokeWidth={0.5}
                    data-oval=""
                />
                <path
                    d={ellipsePath(
                        oval.cx,
                        oval.cy,
                        oval.rx - 1.45,
                        oval.ry - 1.45,
                    )}
                    fill="none"
                    stroke={ink}
                    strokeWidth={0.14}
                />
                {corners.map(({ box }) => (
                    <g key={`${box.x}-${box.y}`}>
                        <path
                            d={cutCornerBox(box, 1.7)}
                            fill={light}
                            stroke={ink}
                            strokeWidth={0.38}
                            data-corner=""
                        />
                        <path
                            d={cutCornerBox(
                                {
                                    x: box.x + 0.8,
                                    y: box.y + 0.8,
                                    w: box.w - 1.6,
                                    h: box.h - 1.6,
                                },
                                1.25,
                            )}
                            fill="none"
                            stroke={ink}
                            strokeWidth={0.12}
                        />
                    </g>
                ))}
                <path
                    d={bannerD}
                    fill={light}
                    stroke={ink}
                    strokeWidth={0.38}
                    data-slot="banner"
                />
                <path
                    d={notchedBanner(
                        {
                            x: banner.x + 1.2,
                            y: banner.y + 0.7,
                            w: banner.w - 2.4,
                            h: banner.h - 1.4,
                        },
                        1.5,
                    )}
                    fill="none"
                    stroke={ink}
                    strokeWidth={0.12}
                />
                {hasEdition && (
                    <path
                        d={cutCornerBox(plaque, 1.2)}
                        fill={light}
                        stroke={ink}
                        strokeWidth={0.25}
                    />
                )}
            </NoteSvg>
            {framed && (
                <Abs
                    x={oval.cx - oval.rx + 1.9}
                    y={oval.cy - oval.ry + 1.9}
                    w={2 * (oval.rx - 1.9)}
                    h={2 * (oval.ry - 1.9)}
                    style={{ borderRadius: '50%', overflow: 'hidden' }}
                    slot="oval-photo"
                >
                    <PhotoSlot
                        x={0}
                        y={0}
                        w={2 * (oval.rx - 1.9)}
                        h={2 * (oval.ry - 1.9)}
                        photo={photo}
                    />
                </Abs>
            )}
            {framed ? (
                <>
                    <NoteSvg slot="value-plate">
                        <path
                            d={cutCornerBox(
                                {
                                    x: oval.cx - 14,
                                    y: oval.cy + oval.ry - 6.5,
                                    w: 28,
                                    h: 8.5,
                                },
                                1.6,
                            )}
                            fill={light}
                            stroke={ink}
                            strokeWidth={0.38}
                        />
                        <path
                            d={cutCornerBox(
                                {
                                    x: oval.cx - 12,
                                    y: oval.cy - oval.ry - 1.4,
                                    w: 24,
                                    h: 4.6,
                                },
                                1.1,
                            )}
                            fill={light}
                            stroke={ink}
                            strokeWidth={0.25}
                        />
                    </NoteSvg>
                    <FitText
                        text={money(value)}
                        x={oval.cx - 12.5}
                        y={oval.cy + oval.ry - 5.8}
                        w={25}
                        h={7.1}
                        maxFontMm={6.4}
                        minFontMm={3}
                        font="heading"
                        family={PLAYFAIR}
                        weight={700}
                        color={ink}
                        align="center"
                        slot="value"
                    />
                    <FitText
                        text={bank}
                        x={oval.cx - 11}
                        y={oval.cy - oval.ry - 1.1}
                        w={22}
                        h={4}
                        maxFontMm={2.4}
                        minFontMm={1.4}
                        font="heading"
                        family={PLAYFAIR}
                        weight={700}
                        caps
                        letterSpacingEm={0.06}
                        color={ink}
                        align="center"
                        slot={bankSlot}
                        clip
                    />
                </>
            ) : (
                <>
                    <FitText
                        text={money(value)}
                        x={oval.cx - oval.rx + 4}
                        y={oval.cy - 10.5}
                        w={2 * oval.rx - 8}
                        h={14}
                        maxFontMm={14}
                        minFontMm={5}
                        font="heading"
                        family={PLAYFAIR}
                        weight={700}
                        color={ink}
                        align="center"
                        slot="value"
                    />
                    <FitText
                        text={bank}
                        x={oval.cx - oval.rx + 7}
                        y={oval.cy + 4.2}
                        w={2 * oval.rx - 14}
                        h={5.2}
                        maxFontMm={2.8}
                        minFontMm={1.4}
                        wrap="words"
                        lineHeight={1.05}
                        font="heading"
                        family={PLAYFAIR}
                        weight={700}
                        caps
                        letterSpacingEm={0.06}
                        color={ink}
                        align="center"
                        slot={bankSlot}
                        clip
                    />
                </>
            )}
            {corners.map(({ box }, index) => (
                <FitText
                    key={index}
                    text={String(value)}
                    x={box.x + 1.5}
                    y={box.y + 1.4}
                    w={box.w - 3}
                    h={box.h - 2.8}
                    maxFontMm={6.5}
                    minFontMm={2.5}
                    font="heading"
                    family={PLAYFAIR}
                    weight={700}
                    color={ink}
                    align="center"
                    slot="corner-value"
                />
            ))}
            <FitText
                text={title}
                x={banner.x + 4.2}
                y={banner.y + 1}
                w={banner.w - 8.4}
                h={banner.h - 2}
                maxFontMm={3.8}
                minFontMm={NOTE_NAME_BOX.minFontMm}
                wrap="words"
                lineHeight={NOTE_NAME_BOX.lineHeight}
                font="heading"
                family={PLAYFAIR}
                weight={700}
                caps
                letterSpacingEm={0.08}
                color={ink}
                align="center"
                slot="edition-name"
                clip
            />
            {hasEdition && (
                <FitText
                    // An own currency ("Kus") gives the note its name; else it says "speelgeld" (UX 4).
                    text={noteName}
                    x={plaque.x + 1.5}
                    y={plaque.y + 0.5}
                    w={plaque.w - 3}
                    h={plaque.h - 1}
                    maxFontMm={2.3}
                    minFontMm={1.5}
                    font="body"
                    weight={600}
                    caps
                    letterSpacingEm={0.12}
                    color={ink}
                    align="center"
                    slot="play-money"
                />
            )}
        </>
    );
}

/* ------------------------------------------------------------------------------------------------------------ */
/* Modern                                                                                                         */
/* ------------------------------------------------------------------------------------------------------------ */

const MODERN = {
    frame: {
        x: FRAME_INSET,
        y: FRAME_INSET,
        w: NOTE_W - 2 * FRAME_INSET,
        h: NOTE_H - 2 * FRAME_INSET,
    },
    disc: 38,
    chip: { x: 9, y: 8.6, w: 15, h: 6.2 },
    numeral: { x: 8.5, y: 18.5, w: 72, h: 33 },
    panel: { x: 86, y: 8.6, w: 35.4, h: 42.8 },
    photo: { x: 52, y: 8.6, w: 30, h: 42.8 },
} as const;

function ModernNoteFace({
    value,
    paper,
    bankName,
    editionName,
    photo,
}: StyledNoteProps) {
    const { theme } = useRender();
    const { frame, chip, numeral, panel, disc } = MODERN;
    const { money, bank, bankSlot, noteName, hasEdition, title } = useNoteWords(
        value,
        bankName,
        editionName,
    );
    const ink = inkOf(theme, paper);
    const light = notePaperLight(paper, theme.paper);
    const shade = tint(ink, paper, 0.82);
    const full = isFullPhoto(photo);
    const framed = photo !== undefined && !full;
    const left = {
        x: frame.x,
        y: frame.y,
        w: panel.x - 2.4 - frame.x,
        h: frame.h,
    };
    const numeralW = framed ? MODERN.photo.x - 2.5 - numeral.x : numeral.w;
    // A bar in the accent of the theme (magenta in Riso, gold in Gala); where the accent is the ink, the note's ink.
    const bar = theme.accent === theme.ink ? ink : theme.accent;

    return (
        <>
            {full ? (
                <FullPhoto field={left} photo={photo} light={light} />
            ) : (
                <NoteSvg slot="colour-field">
                    <path
                        d={`M${frame.x} ${frame.y}H${frame.x + disc}A${disc} ${disc} 0 0 1 ${frame.x} ${frame.y + disc}Z`}
                        fill={shade}
                        data-slot="quarter"
                    />
                </NoteSvg>
            )}
            {framed && (
                <PhotoSlot
                    x={MODERN.photo.x}
                    y={MODERN.photo.y}
                    w={MODERN.photo.w}
                    h={MODERN.photo.h}
                    photo={photo}
                />
            )}
            <Abs
                x={panel.x}
                y={panel.y}
                w={panel.w}
                h={panel.h}
                style={{ background: light }}
                slot="panel"
            />
            <Abs
                x={frame.x}
                y={frame.y}
                w={frame.w}
                h={frame.h}
                style={{
                    border: `${mm(0.6)} solid ${ink}`,
                    boxSizing: 'border-box',
                }}
                slot="frame"
            />
            <Abs
                x={chip.x}
                y={chip.y}
                w={chip.w}
                h={chip.h}
                style={{ background: ink }}
            />
            <FitText
                text={String(value)}
                x={chip.x + 1}
                y={chip.y + 0.4}
                w={chip.w - 2}
                h={chip.h - 0.8}
                maxFontMm={5}
                minFontMm={2.4}
                font="heading"
                family={SPARTAN}
                weight={800}
                color={readableOn(ink)}
                align="center"
                slot="corner-value"
            />
            <FitText
                text={String(value)}
                x={numeral.x}
                y={numeral.y}
                w={numeralW}
                h={numeral.h}
                maxFontMm={44}
                minFontMm={6}
                font="heading"
                family={SPARTAN}
                weight={800}
                letterSpacingEm={-0.04}
                lineHeight={0.86}
                color={ink}
                align="left"
                valign="bottom"
                slot="corner-value"
            />
            <FitText
                text={bank}
                x={panel.x + 3}
                y={panel.y + 2.2}
                w={panel.w - 6}
                h={5.6}
                maxFontMm={2.6}
                minFontMm={1.4}
                wrap="words"
                lineHeight={1.1}
                font="body"
                weight={600}
                caps
                letterSpacingEm={0.08}
                color={ink}
                align="left"
                slot={bankSlot}
                clip
            />
            <Abs
                x={panel.x + 3}
                y={panel.y + 8.8}
                w={8}
                h={1.3}
                style={{ background: bar }}
                slot="bar"
            />
            <FitText
                text={money(value)}
                x={panel.x + 3}
                y={panel.y + 11}
                w={panel.w - 6}
                h={11}
                maxFontMm={9.5}
                minFontMm={3}
                font="heading"
                family={SPARTAN}
                weight={800}
                letterSpacingEm={-0.02}
                color={ink}
                align="left"
                slot="value"
            />
            <FitText
                text={title}
                x={panel.x + 3}
                y={panel.y + 25}
                w={panel.w - 6}
                h={hasEdition ? 11 : 15}
                maxFontMm={hasEdition ? 4.2 : 5}
                minFontMm={NOTE_NAME_BOX.minFontMm}
                wrap="words"
                lineHeight={NOTE_NAME_BOX.lineHeight}
                font="heading"
                family={SPARTAN}
                weight={800}
                color={ink}
                align="left"
                valign="bottom"
                slot="edition-name"
                clip
            />
            {hasEdition && (
                <FitText
                    text={noteName}
                    x={panel.x + 3}
                    y={panel.y + 37}
                    w={panel.w - 6}
                    h={3.6}
                    maxFontMm={2.4}
                    minFontMm={1.5}
                    font="body"
                    weight={600}
                    caps
                    letterSpacingEm={0.08}
                    color={ink}
                    align="left"
                    slot="play-money"
                />
            )}
        </>
    );
}

/* ------------------------------------------------------------------------------------------------------------ */
/* Speels                                                                                                         */
/* ------------------------------------------------------------------------------------------------------------ */

const PLAYFUL = {
    frame: {
        x: FRAME_INSET,
        y: FRAME_INSET,
        w: NOTE_W - 2 * FRAME_INSET,
        h: NOTE_H - 2 * FRAME_INSET,
    },
    radius: 4.5,
    badge: { cx: 50, cy: 30, r: 15.2 },
    pill: { x: 73.5, y: 16.5, w: 33.5, h: 26, r: 6 },
    /** Value bubbles top left and bottom right, icons in the other two corners. */
    bubbles: [
        { cx: 13, cy: 13, kind: 'value' },
        { cx: 117, cy: 13, kind: 'icon' },
        { cx: 13, cy: 47, kind: 'icon' },
        { cx: 117, cy: 47, kind: 'value' },
    ],
    bubbleR: 5.8,
} as const;

/** The polka dots of Speels: round caps on a dash of length 0. */
const POLKA = { width: 0.75, dash: [0, 2.8] } as const;

/** Confetti in the free spots: x, y, shape, colour index (accent, second accent, ink) and a turn in degrees. */
const CONFETTI: readonly [
    number,
    number,
    'dot' | 'tri' | 'wave' | 'plus',
    number,
    number,
][] = [
    [24, 21, 'dot', 0, 0],
    [29.5, 27, 'wave', 1, -20],
    [23, 34, 'tri', 2, 15],
    [28, 41.5, 'plus', 0, 10],
    [22.5, 8.6, 'wave', 2, 0],
    [36, 8.4, 'dot', 1, 0],
    [66.5, 9.5, 'tri', 0, -12],
    [71, 49.5, 'dot', 2, 0],
    [33, 51, 'wave', 0, 15],
    [61, 51.5, 'plus', 1, 0],
    [112.5, 26, 'dot', 1, 0],
    [114, 33.5, 'tri', 0, 30],
    [97, 49.5, 'wave', 1, -10],
    [93, 9, 'plus', 2, 20],
];

function confettiShape(shape: 'dot' | 'tri' | 'wave' | 'plus'): string {
    switch (shape) {
        case 'dot':
            return 'M0.9 0A0.9 0.9 0 1 1 -0.9 0A0.9 0.9 0 1 1 0.9 0Z';
        case 'tri':
            return 'M0 -1.2L1.1 0.8H-1.1Z';
        case 'wave':
            return 'M-2 0Q-1 -1.1 0 0T2 0';
        case 'plus':
            return 'M-1.1 0H1.1M0 -1.1V1.1';
    }
}

function PlayfulNoteFace({
    value,
    paper,
    bankName,
    editionName,
    photo,
}: StyledNoteProps) {
    const { theme } = useRender();
    const { frame, radius, badge, pill, bubbles, bubbleR } = PLAYFUL;
    const { money, bank, bankSlot, noteName, hasEdition, title } = useNoteWords(
        value,
        bankName,
        editionName,
    );
    const ink = inkOf(theme, paper);
    const light = notePaperLight(paper, theme.paper);
    const dots = tint(ink, paper, 0.86);
    const full = isFullPhoto(photo);
    const framed = photo !== undefined && !full;
    const icons: NoteIconName[] = [...noteIcons(value)];
    const colors = [theme.accent, theme.secondaryAccent, ink];
    // The pill of the edition is the strip of the theme's note: the accent in Riso, the ink elsewhere.
    const pillColor = theme.id === 'riso' ? theme.accent : ink;
    // The dots stay 1.6 mm inside the frame, clear of its round corners, so they need no clip.
    const polka = cached('playful:dots', () => {
        const rows: string[] = [];
        const right = frame.x + frame.w - 1.6;
        for (
            let row = 0, y = frame.y + 1.8;
            y < frame.y + frame.h - 1.6;
            row++, y += 2.6
        ) {
            rows.push(
                `M${frame.x + (row % 2 === 0 ? 1.8 : 3.2)} ${y}H${right}`,
            );
        }

        return rows.join('');
    });
    // On a print sheet the dots are one picture per value: a dash pattern in a PDF becomes one shape per dot.
    const raster =
        useContext(RasterNotePattern) && !full
            ? rasterPattern(['playful', dots, paper].join('|'), {
                  w: NOTE_W,
                  h: NOTE_H,
                  clip: frame,
                  clipped: [],
                  free: [
                      {
                          d: polka,
                          color: dots,
                          widthMm: POLKA.width,
                          dash: POLKA.dash,
                      },
                  ],
                  lineMm: POLKA.width,
                  background: paper,
                  density: RASTER_PX_PER_MM,
              })
            : null;
    const badgeD = cached('playful:badge', () =>
        bumpyCircle(badge.cx, badge.cy, badge.r, 18, 0.75),
    );

    return (
        <>
            {full && (
                <FullPhoto
                    field={frame}
                    photo={photo}
                    light={light}
                    radius={radius}
                />
            )}
            {raster !== null && (
                <img
                    src={raster}
                    alt=""
                    aria-hidden="true"
                    data-slot="dots"
                    data-raster=""
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: mm(NOTE_W),
                        height: mm(NOTE_H),
                        maxWidth: 'none',
                    }}
                />
            )}
            <NoteSvg slot="playful">
                {!full && raster === null && (
                    // Polka dots: dotted lines with round caps, one path for the whole field.
                    <path
                        d={polka}
                        fill="none"
                        stroke={dots}
                        strokeWidth={POLKA.width}
                        strokeLinecap="round"
                        strokeDasharray={POLKA.dash.join(' ')}
                        data-slot="dots"
                    />
                )}
                <rect
                    x={frame.x}
                    y={frame.y}
                    width={frame.w}
                    height={frame.h}
                    rx={radius}
                    fill="none"
                    stroke={ink}
                    strokeWidth={0.55}
                    data-frame=""
                />
                <g data-slot="confetti">
                    {CONFETTI.map(([x, y, shape, color, turn]) => (
                        <path
                            key={`${x}-${y}`}
                            d={confettiShape(shape)}
                            transform={`translate(${x} ${y}) rotate(${turn})`}
                            fill={
                                shape === 'dot' || shape === 'tri'
                                    ? colors[color]
                                    : 'none'
                            }
                            stroke={
                                shape === 'wave' || shape === 'plus'
                                    ? colors[color]
                                    : 'none'
                            }
                            strokeWidth={0.55}
                            strokeLinecap="round"
                        />
                    ))}
                </g>
                {/* The badge with a sticker shadow in ink, a little turned. */}
                <g
                    transform={`rotate(-6 ${badge.cx} ${badge.cy})`}
                    data-slot="badge"
                >
                    <path
                        d={badgeD}
                        fill={ink}
                        transform="translate(0.9 1.1)"
                    />
                    <path
                        d={badgeD}
                        fill={light}
                        stroke={ink}
                        strokeWidth={0.5}
                        data-oval=""
                    />
                </g>
                {bubbles.map((bubble) => (
                    <circle
                        key={`${bubble.cx}-${bubble.cy}`}
                        cx={bubble.cx}
                        cy={bubble.cy}
                        r={bubbleR}
                        fill={bubble.kind === 'value' ? ink : light}
                        stroke={ink}
                        strokeWidth={0.45}
                        data-corner=""
                    />
                ))}
                {bubbles
                    .filter((bubble) => bubble.kind === 'icon')
                    .map((bubble, index) => (
                        <NoteIcon
                            key={icons[index]}
                            name={icons[index] as NoteIconName}
                            box={{
                                x: bubble.cx - 4.6,
                                y: bubble.cy - 4.6,
                                w: 9.2,
                                h: 9.2,
                            }}
                            ink={ink}
                            light={light}
                        />
                    ))}
            </NoteSvg>
            {framed && (
                <Abs
                    x={badge.cx - badge.r + 1.2}
                    y={badge.cy - badge.r + 1.2}
                    w={2 * (badge.r - 1.2)}
                    h={2 * (badge.r - 1.2)}
                    style={{ borderRadius: '50%', overflow: 'hidden' }}
                    slot="oval-photo"
                >
                    <PhotoSlot
                        x={0}
                        y={0}
                        w={2 * (badge.r - 1.2)}
                        h={2 * (badge.r - 1.2)}
                        photo={photo}
                    />
                </Abs>
            )}
            {bubbles
                .filter((bubble) => bubble.kind === 'value')
                .map((bubble) => (
                    <FitText
                        key={`${bubble.cx}-${bubble.cy}`}
                        text={String(value)}
                        x={bubble.cx - bubbleR + 1.4}
                        y={bubble.cy - 3}
                        w={2 * bubbleR - 2.8}
                        h={6}
                        maxFontMm={5}
                        minFontMm={2.2}
                        font="heading"
                        family={SPARTAN}
                        weight={800}
                        color={readableOn(ink)}
                        align="center"
                        slot="corner-value"
                    />
                ))}
            {framed ? (
                <>
                    <Abs
                        x={badge.cx - 13}
                        y={badge.cy + badge.r - 5.5}
                        w={26}
                        h={8}
                        style={{
                            background: light,
                            border: `${mm(0.45)} solid ${ink}`,
                            borderRadius: mm(4),
                            boxSizing: 'border-box',
                            transform: 'rotate(-4deg)',
                        }}
                    >
                        <FitText
                            text={money(value)}
                            x={1.5}
                            y={0.6}
                            w={22.1}
                            h={5.9}
                            maxFontMm={5.4}
                            minFontMm={2.6}
                            font="heading"
                            family={SPARTAN}
                            weight={800}
                            color={ink}
                            align="center"
                            slot="value"
                        />
                    </Abs>
                    <Abs
                        x={badge.cx - 12}
                        y={badge.cy - badge.r - 2}
                        w={24}
                        h={5}
                        style={{
                            background: ink,
                            borderRadius: mm(2.5),
                            transform: 'rotate(3deg)',
                        }}
                    >
                        <FitText
                            text={bank}
                            x={1.5}
                            y={0.5}
                            w={21}
                            h={4}
                            maxFontMm={2.6}
                            minFontMm={1.4}
                            font="heading"
                            family={SPARTAN}
                            weight={800}
                            color={readableOn(ink)}
                            align="center"
                            slot={bankSlot}
                            clip
                        />
                    </Abs>
                </>
            ) : (
                <Abs
                    x={badge.cx - badge.r}
                    y={badge.cy - badge.r}
                    w={2 * badge.r}
                    h={2 * badge.r}
                    style={{ transform: 'rotate(-6deg)' }}
                >
                    <FitText
                        text={money(value)}
                        x={3.4}
                        y={7.4}
                        w={2 * badge.r - 6.8}
                        h={11.5}
                        maxFontMm={11}
                        minFontMm={4}
                        font="heading"
                        family={SPARTAN}
                        weight={800}
                        letterSpacingEm={-0.02}
                        color={ink}
                        align="center"
                        slot="value"
                    />
                    <FitText
                        text={bank}
                        x={6}
                        y={19}
                        w={2 * badge.r - 12}
                        h={5.6}
                        maxFontMm={2.8}
                        minFontMm={1.4}
                        wrap="words"
                        lineHeight={1.05}
                        font="heading"
                        family={SPARTAN}
                        weight={800}
                        color={ink}
                        align="center"
                        slot={bankSlot}
                        clip
                    />
                </Abs>
            )}
            <Abs
                x={pill.x}
                y={pill.y}
                w={pill.w}
                h={pill.h}
                style={{
                    background: pillColor,
                    borderRadius: mm(pill.r),
                    transform: 'rotate(3deg)',
                }}
                slot="strip"
            >
                <FitText
                    text={title}
                    x={3}
                    y={hasEdition ? 3 : 3.5}
                    w={pill.w - 6}
                    h={hasEdition ? 14 : 19}
                    maxFontMm={hasEdition ? 5.2 : 6}
                    minFontMm={NOTE_NAME_BOX.minFontMm}
                    wrap="words"
                    lineHeight={NOTE_NAME_BOX.lineHeight}
                    font="heading"
                    family={SPARTAN}
                    weight={800}
                    color={readableOn(pillColor)}
                    align="center"
                    slot="edition-name"
                    clip
                />
                {hasEdition && (
                    <FitText
                        text={noteName}
                        x={3}
                        y={18.6}
                        w={pill.w - 6}
                        h={4}
                        maxFontMm={2.6}
                        minFontMm={1.5}
                        font="body"
                        weight={600}
                        color={readableOn(pillColor)}
                        align="center"
                        slot="play-money"
                    />
                )}
            </Abs>
        </>
    );
}
