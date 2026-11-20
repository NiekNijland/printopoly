import type { ReactNode } from 'react';

import {
    A4,
    HOTEL,
    TAB_FILL,
    HOUSE,
    foldCells,
    netEdges,
    netFor,
    type FoldKind,
    type Net,
    type NetFace,
    type Point,
} from '@/lib/print/extras';
import type { PhotoSource } from '@/lib/render/photo';
import { THEMES, type Theme, type ThemeId } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { CutLegend } from './cut-legend';
import { PhotoSlot } from './photo-slot';
import { Sheet, type ElementProps } from './sheet';

export interface FoldSheetProps extends ElementProps {
    kind: FoldKind;
    /** 1-based sheet number of its kind, and how many sheets there are of it. */
    number: number;
    sheets: number;
    /** Models on this sheet. */
    count: number;
    /** The small picture on the front of every model. */
    photo?: PhotoSource;
}

/** The roof of a house and the roof of a hotel: green and red like the pieces they replace, or the inks of the theme. */
export function modelColors(theme: ThemeId): { house: string; hotel: string } {
    const t = THEMES[theme];

    if (theme === 'riso') {
        return { house: t.secondaryAccent, hotel: t.accent };
    }

    if (theme === 'strak') {
        return { house: '#4A4F57', hotel: '#1B1F24' };
    }

    return { house: '#3E9B5F', hotel: t.secondaryAccent };
}

function path(points: readonly Point[]): string {
    return `${points.map((p, i) => `${i === 0 ? 'M' : 'L'}${String(p.x)} ${String(p.y)}`).join(' ')}Z`;
}

function fillOf(face: NetFace, theme: Theme, roof: string): string {
    switch (face.role) {
        case 'roof':
        case 'top':
            return roof;
        case 'tab':
            return TAB_FILL;
        default:
            return theme.paper;
    }
}

function Windows({
    x,
    y,
    w,
    h,
    cols,
    rows,
    ink,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    cols: number;
    rows: number;
    ink: string;
}) {
    const size = 2.6;
    const cells: ReactNode[] = [];

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            cells.push(
                <rect
                    key={`${String(col)}-${String(row)}`}
                    x={x + ((col + 0.5) * w) / cols - size / 2}
                    y={y + ((row + 0.5) * h) / rows - size / 2}
                    width={size}
                    height={size}
                    fill="none"
                    stroke={ink}
                    strokeWidth={0.25}
                />,
            );
        }
    }

    return <>{cells}</>;
}

function HouseDrawing({
    net,
    theme,
    roof,
}: {
    net: Net;
    theme: Theme;
    roof: string;
}) {
    const front = net.marks.front;
    const back = net.marks.back;

    if (front === undefined || back === undefined) {
        return null;
    }

    const roofLines = net.faces
        .filter((face) => face.role === 'roof')
        .flatMap((face) => {
            const xs = face.points.map((p) => p.x);
            const ys = face.points.map((p) => p.y);
            const left = Math.min(...xs);
            const right = Math.max(...xs);
            const top = Math.min(...ys);
            const bottom = Math.max(...ys);

            // Rows of tiles run along the ridge, which is the long side of the panel.
            return [1, 2, 3, 4].map((i) => ({
                key: `${String(left)}-${String(i)}`,
                x: left + ((right - left) * i) / 5,
                y1: top,
                y2: bottom,
            }));
        });

    return (
        <>
            {roofLines.map((line) => (
                <line
                    key={line.key}
                    x1={line.x}
                    x2={line.x}
                    y1={line.y1}
                    y2={line.y2}
                    stroke="#fff"
                    strokeOpacity={0.45}
                    strokeWidth={0.3}
                />
            ))}
            {/* The front: a door and a window under the roof, upright as drawn. */}
            <g>
                <rect
                    x={front.x + 2}
                    y={front.y + HOUSE.rise + 3}
                    width={3.2}
                    height={HOUSE.wall - 3}
                    fill={roof}
                    stroke={theme.ink}
                    strokeWidth={0.25}
                />
                <rect
                    x={front.x + 7}
                    y={front.y + HOUSE.rise + 2.4}
                    width={3}
                    height={3}
                    fill="none"
                    stroke={theme.ink}
                    strokeWidth={0.25}
                />
            </g>
            {/* The back is folded up from below, so it is drawn upside down. */}
            <g
                transform={`rotate(180 ${String(back.x + back.w / 2)} ${String(back.y + back.h / 2)})`}
            >
                <rect
                    x={back.x + 4.5}
                    y={back.y + HOUSE.rise + 2.4}
                    width={3}
                    height={3}
                    fill="none"
                    stroke={theme.ink}
                    strokeWidth={0.25}
                />
            </g>
        </>
    );
}

function HotelDrawing({
    net,
    theme,
    hotel,
}: {
    net: Net;
    theme: Theme;
    hotel: string;
}) {
    const roof = net.marks.roof;
    const front = net.marks.front;
    const back = net.marks.back;
    const side = net.marks.side;
    const side2 = net.marks.side2;

    if (
        roof === undefined ||
        front === undefined ||
        back === undefined ||
        side === undefined ||
        side2 === undefined
    ) {
        return null;
    }

    return (
        <>
            <text
                x={roof.x + roof.w / 2}
                y={roof.y + roof.h / 2 + 3.4}
                textAnchor="middle"
                fontFamily={theme.headingFont}
                fontWeight={800}
                fontSize={9}
                fill="#fff"
            >
                H
            </text>
            {[front, back].map((wall) => (
                <g key={wall.x}>
                    <rect
                        x={wall.x}
                        y={wall.y}
                        width={wall.w}
                        height={2.2}
                        fill={hotel}
                    />
                    <Windows
                        x={wall.x + 1}
                        y={wall.y + 3}
                        w={wall.w - 2}
                        h={wall.h - 4}
                        cols={5}
                        rows={2}
                        ink={theme.ink}
                    />
                </g>
            ))}
            {[side, side2].map((wall) => (
                <g key={wall.x}>
                    <rect
                        x={wall.x}
                        y={wall.y}
                        width={wall.w}
                        height={2.2}
                        fill={hotel}
                    />
                    <Windows
                        x={wall.x + 1}
                        y={wall.y + 3}
                        w={wall.w - 2}
                        h={wall.h - 4}
                        cols={2}
                        rows={2}
                        ink={theme.ink}
                    />
                </g>
            ))}
        </>
    );
}

function Models({
    kind,
    count,
    photo,
    theme,
    themeId,
}: {
    kind: FoldKind;
    count: number;
    photo?: PhotoSource;
    theme: Theme;
    themeId: ThemeId;
}) {
    const net = netFor(kind);
    const colors = modelColors(themeId);
    const color = kind === 'house' ? colors.house : colors.hotel;
    const { cuts, folds } = netEdges(net);
    const cells = foldCells(kind).slice(0, count);
    const hasPhoto = photo !== undefined;
    // The emblem is always a 12 mm square (HOUSE.w): the front of a house, the middle of a hotel's front wall.
    const emblem = HOUSE.w;
    const emblemAt =
        kind === 'house'
            ? net.marks.front
            : net.marks.front === undefined
              ? undefined
              : {
                    x: net.marks.front.x + (net.marks.front.w - emblem) / 2,
                    y: net.marks.front.y + (HOTEL.h - emblem) / 2 + 1,
                    w: emblem,
                    h: emblem,
                };
    const housePentagon = `polygon(0% 100%, 100% 100%, 100% ${String((HOUSE.rise / (HOUSE.wall + HOUSE.rise)) * 100)}%, 50% 0%, 0% ${String((HOUSE.rise / (HOUSE.wall + HOUSE.rise)) * 100)}%)`;

    return (
        <>
            <svg
                width={mm(A4.w)}
                height={mm(A4.h)}
                viewBox={`0 0 ${String(A4.w)} ${String(A4.h)}`}
                style={{ position: 'absolute', left: 0, top: 0 }}
                aria-hidden="true"
            >
                {cells.map((cell, index) => (
                    <g
                        key={index}
                        transform={`translate(${String(cell.x)} ${String(cell.y)})`}
                    >
                        {net.faces.map((face, faceIndex) => (
                            <path
                                key={faceIndex}
                                d={path(face.points)}
                                fill={fillOf(face, theme, color)}
                            />
                        ))}
                        {kind === 'house' ? (
                            <HouseDrawing
                                net={net}
                                theme={theme}
                                roof={color}
                            />
                        ) : (
                            <HotelDrawing
                                net={net}
                                theme={theme}
                                hotel={color}
                            />
                        )}
                        {folds.map((line, lineIndex) => (
                            <line
                                key={lineIndex}
                                x1={line.x1}
                                y1={line.y1}
                                x2={line.x2}
                                y2={line.y2}
                                stroke="#555"
                                strokeWidth={0.2}
                                strokeDasharray="1.2 1"
                            />
                        ))}
                        {cuts.map((line, lineIndex) => (
                            <line
                                key={lineIndex}
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
                ))}
            </svg>
            {hasPhoto &&
                emblemAt !== undefined &&
                cells.map((cell, index) => (
                    <div
                        key={index}
                        style={{
                            position: 'absolute',
                            left: mm(cell.x + emblemAt.x),
                            top: mm(cell.y + emblemAt.y),
                            width: mm(emblem),
                            height: mm(emblem),
                            clipPath:
                                kind === 'house' ? housePentagon : undefined,
                        }}
                    >
                        <PhotoSlot
                            x={0}
                            y={0}
                            w={emblem}
                            h={emblem}
                            photo={photo}
                        />
                    </div>
                ))}
        </>
    );
}

/** One A4 sheet of fold-up houses or hotels (B123), with cut lines, fold lines and glue tabs. */
export function FoldSheet({
    kind,
    number,
    sheets,
    count,
    photo,
    ...element
}: FoldSheetProps) {
    const theme = THEMES[element.theme];
    const nl = element.locale === 'nl';
    const title = kind === 'house' ? (nl ? 'Huisjes' : 'Houses') : 'Hotels';
    const sheetWord = nl ? 'blad' : 'sheet';

    return (
        <Sheet
            {...element}
            element="fold-models"
            widthMm={A4.w}
            heightMm={A4.h}
            background="#fff"
        >
            <Models
                kind={kind}
                count={count}
                photo={photo}
                theme={theme}
                themeId={element.theme}
            />
            <CutLegend
                theme={theme}
                label={`${title} · ${sheetWord} ${String(number)}/${String(sheets)}`}
            />
        </Sheet>
    );
}
