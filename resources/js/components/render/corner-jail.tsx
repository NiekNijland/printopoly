import { mix } from '@/lib/render/color';
import {
    CORNER_TEXT_ANGLE,
    diagonalBandWidth,
    jailNameParts,
    visitingLegs,
} from '@/lib/render/corner-layout';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { mm } from '@/lib/render/units';

import { RULE_INSET, TILE_GAP, useBoardLook } from './board-look';
import { PawnArt } from './corner-art';
import type { CornerContentProps } from './corner-content';
import { Turned, edgeMargin } from './corner-diagonal';
import { FitText } from './fit-text';
import { PhotoSlot } from './photo-slot';
import { Abs, Frame, useRender, BoxSvg } from './sheet';
import { SpaceIconArt } from './space-icon';

type BoardLook = ReturnType<typeof useBoardLook>;

const jailPlate = (c: number, s: number, place: string, framed: boolean) => {
    const plateH = c * (place === '' ? 0.13 : 0.27);
    const plateBounds = {
        left: s * 0.07,
        top: s * 0.07,
        right: s * 0.93,
        bottom: s * 0.93,
    };
    // With a photo the plate moves towards the outer corner of the cell, so a face in the top third stays free.
    const plateShift = framed ? -s * 0.1 : 0;
    const plateCentre = { x: s / 2, y: s / 2 };
    const plateW = Math.max(
        0,
        diagonalBandWidth(plateBounds, plateCentre, plateShift, plateH) -
            c * 0.02,
    );

    return { plateH, plateShift, plateCentre, plateW };
};

const JailBars = ({ s, barW }: { s: number; barW: number }) => {
    const { theme } = useRender();
    const barCount = 4;

    return (
        <BoxSvg w={s} h={s} data-slot="bars">
            {Array.from({ length: barCount }, (_, index) => {
                const x = (s / (barCount + 1)) * (index + 1);

                return (
                    <rect
                        key={index}
                        x={x - barW / 2}
                        y={0}
                        width={barW}
                        height={s}
                        rx={barW / 2}
                        fill={theme.ink}
                    />
                );
            })}
            <rect
                x={0}
                y={s * 0.1 - barW / 2}
                width={s}
                height={barW}
                fill={theme.ink}
            />
            <rect
                x={0}
                y={s * 0.9 - barW / 2}
                width={s}
                height={barW}
                fill={theme.ink}
            />
        </BoxSvg>
    );
};

const JailPlate = ({
    c,
    label,
    place,
    plate,
}: {
    c: number;
    label: string;
    place: string;
    plate: ReturnType<typeof jailPlate>;
}) => {
    const { theme } = useRender();
    const look = useBoardLook();
    const { plateH, plateShift, plateCentre, plateW } = plate;

    return (
        <Turned x={plateCentre.x} y={plateCentre.y} angle={CORNER_TEXT_ANGLE}>
            <Abs
                x={-plateW / 2}
                y={-plateShift - plateH / 2}
                w={plateW}
                h={plateH}
                style={{
                    background: theme.paper,
                    borderRadius: mm(c * 0.015),
                }}
                slot="plate"
            />
            <Frame
                x={-plateW / 2}
                y={-plateShift - plateH / 2}
                w={plateW}
                h={plateH}
                color={theme.ink}
                strokeMm={theme.frameMm}
                radiusMm={c * 0.015}
                ornate
            />
            <FitText
                text={label}
                x={-plateW / 2 + c * 0.03}
                y={-plateShift - plateH / 2 + c * 0.02}
                w={plateW - c * 0.06}
                h={place === '' ? plateH - c * 0.04 : c * 0.075}
                maxFontMm={c * (place === '' ? 0.08 : 0.05)}
                minFontMm={2}
                {...(place === ''
                    ? look.name
                    : look.style === undefined
                      ? { font: 'body', weight: 700 }
                      : look.figure)}
                align="center"
                slot="in-jail"
            />
            {place !== '' && (
                <FitText
                    text={place}
                    x={-plateW / 2 + c * 0.03}
                    y={-plateShift - plateH / 2 + c * 0.095}
                    w={plateW - c * 0.06}
                    h={plateH - c * 0.115}
                    maxFontMm={c * 0.085}
                    minFontMm={2.2}
                    wrap="words"
                    {...look.name}
                    align="center"
                    lineHeight={1}
                    slot="name"
                />
            )}
        </Turned>
    );
};

const JailCell = ({
    c,
    o,
    s,
    cellRadius,
    framed,
    photo,
    label,
    place,
}: {
    c: number;
    o: number;
    s: number;
    cellRadius: number;
    framed: boolean;
    photo: PhotoSource | undefined;
    label: string;
    place: string;
}) => {
    const { theme } = useRender();
    const cellFill = mix(theme.paper, theme.secondaryAccent, 0.42);
    const line = Math.max(theme.frameMm * 1.6, 0.6);
    const barW = Math.max(0.7, s * 0.026);

    return (
        <div
            style={{
                position: 'absolute',
                left: mm(o),
                top: mm(o),
                width: mm(s),
                height: mm(s),
                borderRadius: mm(cellRadius),
                overflow: cellRadius > 0 ? 'hidden' : undefined,
            }}
        >
            <Abs
                x={0}
                y={0}
                w={s}
                h={s}
                style={{ background: cellFill }}
                slot="cell"
            />
            {framed && <PhotoSlot x={0} y={0} w={s} h={s} photo={photo} />}
            <JailBars s={s} barW={barW} />
            <Frame
                x={0}
                y={0}
                w={s}
                h={s}
                color={theme.ink}
                strokeMm={line}
                radiusMm={cellRadius}
            />
            <JailPlate
                c={c}
                label={label}
                place={place}
                plate={jailPlate(c, s, place, framed)}
            />
        </div>
    );
};

const JailVisiting = ({
    c,
    o,
    s,
    m,
    strip,
    visiting,
    look,
}: {
    c: number;
    o: number;
    s: number;
    m: number;
    strip: number;
    visiting: string;
    look: BoardLook;
}) => {
    const [firstLeg, secondLeg] = visitingLegs(visiting);
    const legH = strip - m - c * 0.04;

    return (
        <>
            {firstLeg !== '' && (
                <FitText
                    text={firstLeg}
                    x={o + c * 0.04}
                    y={o + s + c * 0.02}
                    w={s - c * 0.06}
                    h={legH}
                    maxFontMm={c * 0.12}
                    minFontMm={2.2}
                    {...look.name}
                    align="center"
                    lineHeight={1}
                    slot="visiting"
                />
            )}
            {secondLeg !== '' && (
                <Turned
                    x={o + s + strip / 2 - (m - c * 0.02) / 2}
                    y={o + s / 2}
                    angle={-90}
                >
                    <FitText
                        text={secondLeg}
                        x={-(s - c * 0.06) / 2}
                        y={-legH / 2}
                        w={s - c * 0.06}
                        h={legH}
                        maxFontMm={c * 0.12}
                        minFontMm={2.2}
                        {...look.name}
                        align="center"
                        lineHeight={1}
                        slot="visiting-2"
                    />
                </Turned>
            )}
        </>
    );
};

const JailVisitor = ({
    c,
    o,
    s,
    m,
    strip,
    icon,
}: {
    c: number;
    o: number;
    s: number;
    m: number;
    strip: number;
    icon: CornerContentProps['icon'];
}) => {
    const { theme } = useRender();
    const pawn = Math.min(strip * 0.62, c * 0.2);

    return (
        <Turned
            x={o + s + (strip - m + c * 0.02) / 2}
            y={o + s + (strip - m + c * 0.02) / 2}
            angle={CORNER_TEXT_ANGLE}
        >
            {icon !== undefined ? (
                <SpaceIconArt
                    icon={icon}
                    fallback={null}
                    x={-pawn / 2}
                    y={-pawn / 2}
                    size={pawn}
                    color={theme.ink}
                    strokeWidth={1.6}
                />
            ) : (
                <PawnArt x={-pawn / 2} y={-pawn / 2} size={pawn} />
            )}
        </Turned>
    );
};

export const JailCorner = ({
    size: c,
    name,
    text,
    layout,
    photo,
    icon,
}: CornerContentProps) => {
    const { locale } = useRender();
    const look = useBoardLook();
    const t = STRINGS[locale];
    const m = edgeMargin(c);
    const strip = c * 0.3;
    // Vintage keeps its double rule free and Speels its tile edge: the cell moves in from the inner edges (B268).
    const o =
        look.style === 'vintage'
            ? RULE_INSET + 1.35
            : look.style === 'playful'
              ? TILE_GAP + 0.9
              : 0;
    const cellRadius = look.style === 'playful' ? 1.8 : 0;
    const s = c - strip - o;
    const parts = jailNameParts(name, t.justVisiting);
    const { visiting } = parts;
    const label = text ?? t.inJail;
    // "In jail" over "Jail" says the same twice: then the label alone, large.
    const place = label
        .toLocaleLowerCase()
        .includes(parts.place.toLocaleLowerCase())
        ? ''
        : parts.place;
    const framed = layout === 'framed';

    return (
        <>
            <JailCell
                c={c}
                o={o}
                s={s}
                cellRadius={cellRadius}
                framed={framed}
                photo={photo}
                label={label}
                place={place}
            />
            <JailVisiting
                c={c}
                o={o}
                s={s}
                m={m}
                strip={strip}
                visiting={visiting}
                look={look}
            />
            <JailVisitor c={c} o={o} s={s} m={m} strip={strip} icon={icon} />
        </>
    );
};
