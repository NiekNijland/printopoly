import type { Locale } from '@/lib/game/types';
import { CARD, alignmentTargets, type PageItem } from '@/lib/print/composition';
import { duplexCardSheets } from '@/lib/print/imposition';
import { mm } from '@/lib/render/units';

const INK = '#1b1f24';
const GREY = '#9aa1a9';
const FONT = "'Instrument Sans', sans-serif";
/** Half the length of a crosshair arm, in mm. */
const ARM = 12;
/** The scales on the back run this many mm each way. */
const SCALE = 5;
/**
 * The card slot the explanation sits in: the top middle one, which has no crosshair. It gets no outline, so the
 * text never runs over a frame (bug 35 of test round 3).
 */
const TEXT_SLOT = 1;

const TEXT: Record<
    Locale,
    Record<'front' | 'back', { title: string; body: string }> & { top: string }
> = {
    nl: {
        top: 'Bovenkant',
        front: {
            title: 'Uitlijntest, voorkant',
            body: 'Print deze pagina en de volgende samen dubbelzijdig, op werkelijke grootte, omslaan over de lange kant. Houd het vel daarna tegen het licht: elk kruis op de voorkant valt op het kruis op de achterkant.',
        },
        back: {
            title: 'Uitlijntest, achterkant',
            body: 'Lees op de schaaltjes af hoeveel millimeter het kruis van de voorkant ernaast valt. Tot 1,5 mm zie je niet terug, want zo ver lopen de achterkanten door. Staat deze tekst op zijn kop ten opzichte van de voorkant, dan sloeg de printer om over de korte kant: kies in het printvenster de lange kant.',
        },
    },
    en: {
        top: 'Top',
        front: {
            title: 'Alignment test, front',
            body: 'Print this page and the next one together on both sides, at actual size, flipping on the long edge. Then hold the sheet up to the light: every cross on the front should sit on the cross on the back.',
        },
        back: {
            title: 'Alignment test, back',
            body: 'Read on the small scales how many millimetres the cross on the front is off. Up to 1.5 mm will not show, because the backs run on that far. If this text is upside down compared with the front, the printer flipped on the short edge: choose the long edge in the print dialog.',
        },
    },
};

function Scale({ x, y }: { x: number; y: number }) {
    const ticks = Array.from({ length: 2 * SCALE + 1 }, (_, i) => i - SCALE);

    return (
        <>
            {ticks.map((t) => {
                const long = t % 5 === 0 ? 2.4 : 1.2;

                return (
                    <g key={t}>
                        <line
                            x1={x + t}
                            y1={y - long}
                            x2={x + t}
                            y2={y + long}
                            stroke={INK}
                            strokeWidth={0.15}
                        />
                        <line
                            x1={x - long}
                            y1={y + t}
                            x2={x + long}
                            y2={y + t}
                            stroke={INK}
                            strokeWidth={0.15}
                        />
                    </g>
                );
            })}
            {[-SCALE, SCALE].map((t) => (
                <g key={`n${String(t)}`}>
                    {/* "5" just past the end of each scale: above the horizontal arm, right of the vertical one. */}
                    <text
                        x={x + t * 1.4}
                        y={y - 1.2}
                        fontSize={2.4}
                        textAnchor="middle"
                        fontFamily={FONT}
                        fill={INK}
                    >
                        {String(Math.abs(t))}
                    </text>
                    <text
                        x={x + 1.2}
                        y={y + t * 1.4 + 0.8}
                        fontSize={2.4}
                        fontFamily={FONT}
                        fill={INK}
                    >
                        {String(Math.abs(t))}
                    </text>
                </g>
            ))}
        </>
    );
}

/**
 * The alignment test of the home cards (B134), on a whole A4 page: the outlines of the nine cards, a
 * crosshair in the middle of five of them and a short explanation. The back has the same crosshairs,
 * mirrored like the card backs, with millimetre scales to read how far the printer shifted.
 */
export function AlignmentArt({
    side,
    locale,
}: {
    side: NonNullable<PageItem['side']>;
    locale: Locale;
}) {
    const plan = duplexCardSheets(9, CARD);
    const sheet = plan.pages[0];
    const { w, h } = plan.sheet;
    const text = TEXT[locale];
    const slots = sheet?.[side].items ?? [];
    const textSlot = slots.find((slot) => slot.index === TEXT_SLOT)?.trim;
    // The arrow and "top" sit in the margin above the cards.
    const top = Math.min(...slots.map((slot) => slot.trim.y));

    return (
        <div
            data-alignment={side}
            style={{ position: 'absolute', inset: 0, color: INK }}
        >
            <svg
                width={mm(w)}
                height={mm(h)}
                viewBox={`0 0 ${String(w)} ${String(h)}`}
                style={{ position: 'absolute', left: 0, top: 0 }}
            >
                {slots
                    .filter((slot) => slot.index !== TEXT_SLOT)
                    .map((slot) => (
                        <rect
                            key={slot.index}
                            x={slot.trim.x}
                            y={slot.trim.y}
                            width={slot.trim.w}
                            height={slot.trim.h}
                            fill="none"
                            stroke={GREY}
                            strokeWidth={0.2}
                        />
                    ))}
                {alignmentTargets(side).map((point, index) => (
                    <g key={index} data-target="">
                        <line
                            x1={point.x - ARM}
                            y1={point.y}
                            x2={point.x + ARM}
                            y2={point.y}
                            stroke={INK}
                            strokeWidth={0.2}
                        />
                        <line
                            x1={point.x}
                            y1={point.y - ARM}
                            x2={point.x}
                            y2={point.y + ARM}
                            stroke={INK}
                            strokeWidth={0.2}
                        />
                        {side === 'front' ? (
                            <circle
                                cx={point.x}
                                cy={point.y}
                                r={4}
                                fill="none"
                                stroke={INK}
                                strokeWidth={0.2}
                            />
                        ) : (
                            <Scale x={point.x} y={point.y} />
                        )}
                    </g>
                ))}
                <path
                    d={`M ${String(w / 2 - 14)} ${String(top - 3)} l -2.5 0 l 2.5 -3.5 l 2.5 3.5 z`}
                    fill={INK}
                />
            </svg>
            <div
                data-alignment-top=""
                style={{
                    position: 'absolute',
                    left: mm(w / 2 - 10),
                    top: mm(top - 7.2),
                    fontFamily: FONT,
                    fontSize: mm(2.8),
                    lineHeight: 1.3,
                }}
            >
                {text.top}
            </div>
            {textSlot !== undefined && (
                <div
                    data-alignment-text=""
                    style={{
                        position: 'absolute',
                        left: mm(textSlot.x),
                        width: mm(textSlot.w),
                        top: mm(textSlot.y + 2),
                        height: mm(textSlot.h - 4),
                        overflow: 'hidden',
                        fontFamily: FONT,
                        fontSize: mm(2.7),
                        lineHeight: 1.32,
                    }}
                >
                    <div
                        style={{
                            fontWeight: 700,
                            fontSize: mm(3.8),
                            marginBottom: mm(1.5),
                        }}
                    >
                        {text[side].title}
                    </div>
                    {text[side].body}
                </div>
            )}
        </div>
    );
}
