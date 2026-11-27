import { useContext } from 'react';

import {
    cached,
    hatch,
    rasterPattern,
    ringField,
    rosette,
    scallopBand,
    type PatternDensity,
} from '@/lib/render/banknote-pattern';

import {
    BANKNOTE_SIZE_MM,
    NoteRaster,
    NoteSvg,
    RASTER_PX_PER_MM,
    RasterNotePattern,
    tint,
} from './banknote-parts';

/**
 * Layout of the note face (B137), after the original play money: a double frame with a
 * scalloped band between, a guilloche field, an oval with the value in the middle, value
 * boxes in two corners and icons in the other two, and a dark strip with the edition name.
 */
export const NOTE_LAYOUT = {
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

export const noteHatches = (density: PatternDensity): string => {
    const hatchGap = density === 'full' ? 0.7 : 1.2;

    return cached(`hatch:${density}`, () =>
        [...NOTE_LAYOUT.valueBoxes, ...NOTE_LAYOUT.iconBoxes]
            .map((corner) => hatch(corner.hatch, hatchGap))
            .join(''),
    );
};

const noteGuillochePaths = (density: PatternDensity) => {
    const { w, h } = BANKNOTE_SIZE_MM;
    const { field, strip, oval } = NOTE_LAYOUT;

    return {
        rings: cached(`rings:${density}`, () =>
            ringField(field, density, { ellipse: oval, rects: [strip] }),
        ),
        band: cached('band', () =>
            scallopBand(
                {
                    x: NOTE_LAYOUT.innerInset - 0.25,
                    y: NOTE_LAYOUT.innerInset - 0.25,
                    w: w - 2 * (NOTE_LAYOUT.innerInset - 0.25),
                    h: h - 2 * (NOTE_LAYOUT.innerInset - 0.25),
                },
                0.45,
            ),
        ),
        rosettes: cached('rosette', () =>
            [0, Math.PI / 18]
                .map((phase) =>
                    rosette(oval.cx, oval.cy, oval.rx + 9, oval.ry + 6, phase),
                )
                .join(''),
        ),
    };
};

type GuillocheProps = {
    paper: string;
    patternInk: string;
    density: PatternDensity;
    riso: boolean;
    full: boolean;
    clipId: string;
};

const NoteGuillocheLines = ({
    patternInk,
    density,
    riso,
    clipId,
    ringColor,
    rosetteColor,
    lineMm,
}: Omit<GuillocheProps, 'paper' | 'full'> & {
    ringColor: string;
    rosetteColor: string;
    lineMm: number;
}) => {
    const { field } = NOTE_LAYOUT;
    const { rings, band, rosettes } = noteGuillochePaths(density);

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
                    <path d={band} strokeWidth={0.15} data-pattern="band" />
                )}
            </g>
        </NoteSvg>
    );
};

export const NoteGuilloche = (props: GuillocheProps) => {
    const { paper, patternInk, density, riso, full } = props;
    const { w, h } = BANKNOTE_SIZE_MM;
    const { field } = NOTE_LAYOUT;
    const { rings, band, rosettes } = noteGuillochePaths(density);
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

    return raster !== null ? (
        <NoteRaster src={raster} slot="guilloche" offset={riso} />
    ) : (
        <NoteGuillocheLines
            {...props}
            ringColor={ringColor}
            rosetteColor={rosetteColor}
            lineMm={lineMm}
        />
    );
};
