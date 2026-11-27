import { useContext } from 'react';

import {
    cornerBlocks,
    ellipsePath,
    latheRosette,
    ropeBand,
    waveNet,
} from '@/lib/render/banknote-guilloche';
import {
    cached,
    hatch,
    rasterPattern,
    type Rect,
} from '@/lib/render/banknote-pattern';

import {
    NoteRaster,
    NoteSvg,
    RASTER_PX_PER_MM,
    RasterNotePattern,
    tint,
} from './banknote-parts';
import { FRAME_INSET, NOTE_H, NOTE_W } from './banknote-styles-shared';

export const VINTAGE = {
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
const vintageCovers = (x: number, y: number): boolean => {
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
};

/** The line work of a Vintage note, the same for every value: cached once per page. */
const vintageLines = () => {
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
};

const VINTAGE_LINE_MM = 0.09;

const VintageGuillocheLines = ({
    patternInk,
    riso,
    clipId,
    netColor,
    rosetteColor,
}: {
    patternInk: string;
    riso: boolean;
    clipId: string;
    netColor: string;
    rosetteColor: string;
}) => {
    const { field } = VINTAGE;
    const lines = vintageLines();

    return (
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
            <g fill="none" strokeWidth={VINTAGE_LINE_MM}>
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
                <path d={lines.blocks} stroke={patternInk} strokeWidth={0.14} />
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
    );
};

export const VintageGuilloche = ({
    paper,
    patternInk,
    full,
    riso,
    clipId,
}: {
    paper: string;
    patternInk: string;
    full: boolean;
    riso: boolean;
    clipId: string;
}) => {
    const { field } = VINTAGE;
    const lines = vintageLines();
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
                  lineMm: VINTAGE_LINE_MM,
                  background: full ? null : paper,
                  density: RASTER_PX_PER_MM,
              },
          )
        : null;

    return raster !== null ? (
        <NoteRaster src={raster} slot="guilloche" offset={riso} />
    ) : (
        <VintageGuillocheLines
            patternInk={patternInk}
            riso={riso}
            clipId={clipId}
            netColor={netColor}
            rosetteColor={rosetteColor}
        />
    );
};
