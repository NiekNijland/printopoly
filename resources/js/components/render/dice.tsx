import {
    A4,
    DIE_EDGE,
    DIE_LAYOUT,
    TAB_FILL,
    dieNet,
    dicePlacements,
    netEdges,
    pipPositions,
} from '@/lib/print/extras';
import type { PhotoSource } from '@/lib/render/photo';
import { THEMES, type Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { CutLegend } from './cut-legend';
import { PhotoSlot } from './photo-slot';
import { brandColor } from './rules-booklet';
import { Abs, Sheet, type ElementProps } from './sheet';

export interface DiceSheetProps extends ElementProps {
    /** The picture on the faces, under the pips. */
    photo?: PhotoSource;
    editionName: string;
}

/** Offset of the faces inside the net: the room for the glue tab above them. */
const TOP = 4;

function Die({
    x,
    y,
    theme,
    hasPhoto,
}: {
    x: number;
    y: number;
    theme: Theme;
    hasPhoto: boolean;
}) {
    const net = dieNet();
    const { cuts, folds } = netEdges(net);
    const radius = DIE_EDGE * 0.09;

    return (
        <g transform={`translate(${String(x)} ${String(y)})`}>
            {net.faces.map((face, index) => (
                <path
                    key={index}
                    d={`${face.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${String(p.x)} ${String(p.y)}`).join(' ')}Z`}
                    fill={face.role === 'tab' ? TAB_FILL : theme.paper}
                />
            ))}
            {DIE_LAYOUT.map(([col, row, pips]) => (
                <g key={`${String(col)}-${String(row)}`}>
                    {!hasPhoto && (
                        <rect
                            x={col * DIE_EDGE + 1.2}
                            y={TOP + row * DIE_EDGE + 1.2}
                            width={DIE_EDGE - 2.4}
                            height={DIE_EDGE - 2.4}
                            rx={2}
                            fill="none"
                            stroke={brandColor(theme)}
                            strokeWidth={0.4}
                        />
                    )}
                    {pipPositions(pips).map(([fx, fy], index) => (
                        <circle
                            key={index}
                            cx={col * DIE_EDGE + fx * DIE_EDGE}
                            cy={TOP + row * DIE_EDGE + fy * DIE_EDGE}
                            r={radius}
                            fill={
                                hasPhoto
                                    ? '#fff'
                                    : pips === 1
                                      ? brandColor(theme)
                                      : theme.ink
                            }
                            stroke={theme.ink}
                            strokeWidth={hasPhoto ? 0.3 : 0}
                        />
                    ))}
                </g>
            ))}
            {folds.map((line, index) => (
                <line
                    key={index}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke="#555"
                    strokeWidth={0.2}
                    strokeDasharray="1.2 1"
                />
            ))}
            {cuts.map((line, index) => (
                <line
                    key={index}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke={theme.ink}
                    strokeWidth={0.25}
                    strokeLinecap="round"
                />
            ))}
        </g>
    );
}

/** The sheet with the nets of two dice (B123): cut, fold and glue, with the pips and an optional photo on every face. */
export function DiceSheet({ photo, editionName, ...element }: DiceSheetProps) {
    const theme = THEMES[element.theme];
    const hasPhoto = photo !== undefined;
    const places = dicePlacements();
    const nl = element.locale === 'nl';

    return (
        <Sheet
            {...element}
            element="dice"
            widthMm={A4.w}
            heightMm={A4.h}
            background="#fff"
        >
            <Abs x={12} y={14} w={A4.w - 24} h={20}>
                <div
                    style={{
                        fontFamily: theme.headingFont,
                        fontWeight: theme.headingWeight,
                        fontSize: mm(9),
                        lineHeight: 1.1,
                        color: theme.ink,
                    }}
                >
                    {nl ? 'Dobbelstenen' : 'Dice'}
                </div>
                <div
                    style={{
                        marginTop: mm(1.5),
                        fontFamily: theme.monoFont,
                        fontSize: mm(2.9),
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: brandColor(theme),
                    }}
                >
                    {editionName}
                </div>
            </Abs>
            <svg
                width={mm(A4.w)}
                height={mm(A4.h)}
                viewBox={`0 0 ${String(A4.w)} ${String(A4.h)}`}
                style={{ position: 'absolute', left: 0, top: 0 }}
                aria-hidden="true"
            >
                {places.map((place, index) => (
                    <Die
                        key={index}
                        x={place.x}
                        y={place.y}
                        theme={theme}
                        hasPhoto={hasPhoto}
                    />
                ))}
            </svg>
            {hasPhoto &&
                places.flatMap((place, index) =>
                    DIE_LAYOUT.map(([col, row]) => (
                        <div
                            key={`${String(index)}-${String(col)}-${String(row)}`}
                            style={{
                                position: 'absolute',
                                left: mm(place.x + col * DIE_EDGE),
                                top: mm(place.y + TOP + row * DIE_EDGE),
                                width: mm(DIE_EDGE),
                                height: mm(DIE_EDGE),
                                // The pips go over the photo: the photo sits under the svg's pips, so
                                // it is drawn first and the pips are redrawn on top below.
                            }}
                        >
                            <PhotoSlot
                                x={0}
                                y={0}
                                w={DIE_EDGE}
                                h={DIE_EDGE}
                                photo={photo}
                            />
                        </div>
                    )),
                )}
            {hasPhoto && (
                <svg
                    width={mm(A4.w)}
                    height={mm(A4.h)}
                    viewBox={`0 0 ${String(A4.w)} ${String(A4.h)}`}
                    style={{ position: 'absolute', left: 0, top: 0 }}
                    aria-hidden="true"
                >
                    {places.map((place, index) => (
                        <g
                            key={index}
                            transform={`translate(${String(place.x)} ${String(place.y)})`}
                        >
                            {DIE_LAYOUT.map(([col, row, pips]) =>
                                pipPositions(pips).map(([fx, fy], pipIndex) => (
                                    <circle
                                        key={`${String(col)}-${String(row)}-${String(pipIndex)}`}
                                        cx={col * DIE_EDGE + fx * DIE_EDGE}
                                        cy={
                                            TOP + row * DIE_EDGE + fy * DIE_EDGE
                                        }
                                        r={DIE_EDGE * 0.09}
                                        fill="#fff"
                                        stroke={theme.ink}
                                        strokeWidth={0.3}
                                    />
                                )),
                            )}
                            {dieNetCuts(theme)}
                        </g>
                    ))}
                </svg>
            )}
            <CutLegend theme={theme} label={nl ? 'Dobbelstenen' : 'Dice'} />
        </Sheet>
    );
}

/** The cut and fold lines again, over the photos. */
function dieNetCuts(theme: Theme) {
    const { cuts, folds } = netEdges(dieNet());

    return (
        <>
            {folds.map((line, index) => (
                <line
                    key={`f${String(index)}`}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke="#555"
                    strokeWidth={0.2}
                    strokeDasharray="1.2 1"
                />
            ))}
            {cuts.map((line, index) => (
                <line
                    key={`c${String(index)}`}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke={theme.ink}
                    strokeWidth={0.25}
                    strokeLinecap="round"
                />
            ))}
        </>
    );
}
