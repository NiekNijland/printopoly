import { mix, withAlpha } from '@/lib/render/color';
import type { PawnStyle } from '@/lib/render/edition-part-styles';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { partStyleOf } from '@/lib/render/style';
import { THEMES, type Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { ruleColor, wobblyRect } from './board-look';
import { FitText } from './fit-text';
import { BAND_OPACITY, PhotoSlot, isFullPhoto } from './photo-slot';
import {
    Art,
    ConfettiShape,
    GuillocheRings,
    blockColor,
    diamond,
    pieceText,
    scallopedCircle,
    seedOf,
    vintagePaper,
    type ConfettiPiece,
} from './piece-styles';
import { Abs, Sheet, useRender, type ElementProps } from './sheet';

/** Unfolded pawn: front, back (upside down, so it stands when folded) and an insertion foot. */
export const PAWN_SIZE_MM = { w: 40, h: 55 } as const;

const PANEL_HEIGHT = 22.5;
/**
 * Every pawn has the same two halves (R6 Tom, Sara): a portrait on the left, the photo or the first letter of the
 * name, and the name on the right, in the same box and so at the same size with or without a photo. The portrait
 * is a little taller than wide, the shape of a head and shoulders (ronde 3, UX 1). The styles (B271) keep the
 * portrait where it is, so the photo is cropped to the same frame in every style.
 */
const PORTRAIT = { x: 1.5, y: 1.5, w: 17, h: PANEL_HEIGHT - 3 } as const;
const NAME_BOX = {
    x: PORTRAIT.x + PORTRAIT.w + 1.5,
    y: 1.5,
    w: PAWN_SIZE_MM.w - (PORTRAIT.x + PORTRAIT.w + 1.5) - 1.5,
    h: PANEL_HEIGHT - 3,
} as const;
/** The largest name on any pawn, with or without a photo, also on the band of a full photo. */
const PAWN_NAME_MAX_MM = 5;

/** The box of the name in a style: Vintage leaves room for its flourishes, Modern for its bar. */
const nameBoxOf = (style: PawnStyle | undefined) => {
    switch (style) {
        case 'vintage':
            return { ...NAME_BOX, y: 4.6, h: 13.3 };
        case 'modern':
            return { x: NAME_BOX.x + 0.4, y: 2, w: NAME_BOX.w - 0.4, h: 15.4 };
        case 'playful':
            return { ...NAME_BOX, y: 4, h: 14.5 };
        case undefined:
            return NAME_BOX;
    }
};

export interface PawnSheetItemProps extends ElementProps {
    name: string;
    photo?: PhotoSource;
}

/** The first letter of the name in a round stamp, where a pawn without a photo would have one. */
const Initial = ({
    name,
    look,
}: {
    name: string;
    look: PawnStyle | undefined;
}) => {
    const { theme } = useRender();
    const letter = Array.from(name.trim())[0]?.toLocaleUpperCase() ?? '';
    const size = Math.min(PORTRAIT.w, PORTRAIT.h) - 1;
    const text = pieceText(look, 'name');

    if (look === 'vintage') {
        return <VintageInitial letter={letter} />;
    }

    if (look === 'modern') {
        return (
            <>
                <Abs
                    {...PORTRAIT}
                    slot="initial"
                    style={{ background: blockColor(theme) }}
                />
                {letter !== '' && (
                    <FitText
                        text={letter}
                        x={PORTRAIT.x + 1.6}
                        y={PORTRAIT.y + 0.6}
                        w={PORTRAIT.w - 3.2}
                        h={PORTRAIT.h - 1.4}
                        maxFontMm={17}
                        minFontMm={6}
                        font="heading"
                        family={text.family}
                        weight={text.weight}
                        align="left"
                        valign="bottom"
                        lineHeight={0.9}
                        color={theme.paper}
                        slot="initial-letter"
                    />
                )}
            </>
        );
    }

    if (look === 'playful') {
        return <PlayfulInitial letter={letter} seed={seedOf(name)} />;
    }

    return (
        <>
            <Abs
                x={PORTRAIT.x + (PORTRAIT.w - size) / 2}
                y={PORTRAIT.y + (PORTRAIT.h - size) / 2}
                w={size}
                h={size}
                slot="initial"
                style={{
                    borderRadius: '50%',
                    background: withAlpha(theme.accent, 0.18),
                    border: `${mm(Math.max(0.35, theme.frameMm))} solid ${theme.ink}`,
                    boxSizing: 'border-box',
                }}
            />
            {letter !== '' && (
                <FitText
                    text={letter}
                    x={PORTRAIT.x}
                    y={PORTRAIT.y}
                    w={PORTRAIT.w}
                    h={PORTRAIT.h}
                    maxFontMm={9}
                    minFontMm={4}
                    font="heading"
                    align="center"
                    valign="middle"
                    slot="initial-letter"
                />
            )}
        </>
    );
};

/** Vintage: the letter in an oval medallion on fine guilloche rings, like the value on an old banknote. */
const VintageInitial = ({ letter }: { letter: string }) => {
    const { theme } = useRender();
    const rule = ruleColor(theme);
    const cx = PORTRAIT.w / 2;
    const cy = PORTRAIT.h / 2;
    const rx = PORTRAIT.w / 2 - 2.3;
    const ry = PORTRAIT.h / 2 - 2.3;
    const text = pieceText('vintage', 'name');

    return (
        <>
            <Art {...PORTRAIT} slot="initial" clip>
                <g opacity={0.55}>
                    <GuillocheRings
                        w={PORTRAIT.w}
                        h={PORTRAIT.h}
                        color={rule}
                    />
                </g>
                <rect
                    x={0.15}
                    y={0.15}
                    width={PORTRAIT.w - 0.3}
                    height={PORTRAIT.h - 0.3}
                    fill="none"
                    stroke={rule}
                    strokeWidth={0.3}
                />
                <ellipse
                    cx={cx}
                    cy={cy}
                    rx={rx}
                    ry={ry}
                    fill={vintagePaper(theme.paper, 0.3)}
                    stroke={rule}
                    strokeWidth={0.32}
                />
                <ellipse
                    cx={cx}
                    cy={cy}
                    rx={rx - 0.65}
                    ry={ry - 0.65}
                    fill="none"
                    stroke={rule}
                    strokeWidth={0.12}
                />
            </Art>
            {letter !== '' && (
                <FitText
                    text={letter}
                    x={PORTRAIT.x + 3}
                    y={PORTRAIT.y + 3}
                    w={PORTRAIT.w - 6}
                    h={PORTRAIT.h - 6}
                    maxFontMm={10}
                    minFontMm={4}
                    font="heading"
                    family={text.family}
                    weight={text.weight}
                    align="center"
                    valign="middle"
                    color={theme.accent}
                    slot="initial-letter"
                />
            )}
        </>
    );
};

/** Speels: the letter, a little turned, on a scalloped badge with a stitched ring. */
const PlayfulInitial = ({ letter, seed }: { letter: string; seed: number }) => {
    const { theme } = useRender();
    const cx = PORTRAIT.w / 2;
    const cy = PORTRAIT.h / 2;
    const r = Math.min(PORTRAIT.w, PORTRAIT.h) / 2 - 1.3;
    const turn = seed % 2 === 0 ? -8 : 7;
    const text = pieceText('playful', 'name');

    return (
        <>
            <Art {...PORTRAIT} slot="initial">
                <path
                    d={scallopedCircle(cx, cy, r, 14)}
                    fill={mix(theme.paper, blockColor(theme), 0.22)}
                    stroke={theme.ink}
                    strokeWidth={0.35}
                    strokeLinejoin="round"
                />
                <circle
                    cx={cx}
                    cy={cy}
                    r={r - 1.9}
                    fill="none"
                    stroke={blockColor(theme)}
                    strokeWidth={0.28}
                    strokeDasharray="0.9 0.7"
                    strokeLinecap="round"
                />
            </Art>
            {letter !== '' && (
                <Abs
                    x={0}
                    y={0}
                    w={PAWN_SIZE_MM.w}
                    h={PANEL_HEIGHT}
                    style={{
                        transform: `rotate(${String(turn)}deg)`,
                        transformOrigin: `${mm(PORTRAIT.x + cx)} ${mm(PORTRAIT.y + cy)}`,
                    }}
                >
                    <FitText
                        text={letter}
                        x={PORTRAIT.x + 3}
                        y={PORTRAIT.y + 3}
                        w={PORTRAIT.w - 6}
                        h={PORTRAIT.h - 6}
                        maxFontMm={10}
                        minFontMm={4}
                        font="heading"
                        family={text.family}
                        weight={text.weight}
                        align="center"
                        valign="middle"
                        slot="initial-letter"
                    />
                </Abs>
            )}
        </>
    );
};

/** The photo in the portrait, with the edge of the style around it. */
const Portrait = ({
    photo,
    look,
}: {
    photo: PhotoSource;
    look: PawnStyle | undefined;
}) => {
    const { theme } = useRender();

    if (look === 'playful') {
        const radius = 2.4;

        return (
            <>
                <Abs
                    {...PORTRAIT}
                    style={{ borderRadius: mm(radius), overflow: 'hidden' }}
                >
                    <PhotoSlot
                        x={0}
                        y={0}
                        w={PORTRAIT.w}
                        h={PORTRAIT.h}
                        photo={photo}
                    />
                </Abs>
                <Art {...PORTRAIT} slot="photo-edge">
                    <rect
                        x={0.15}
                        y={0.15}
                        width={PORTRAIT.w - 0.3}
                        height={PORTRAIT.h - 0.3}
                        rx={radius}
                        fill="none"
                        stroke={theme.ink}
                        strokeWidth={0.35}
                    />
                </Art>
                <Tape x={PORTRAIT.x + 1.4} y={PORTRAIT.y + 1.1} turn={-38} />
            </>
        );
    }

    return (
        <>
            <PhotoSlot {...PORTRAIT} photo={photo} />
            {look === 'vintage' && (
                <Art {...PORTRAIT} slot="photo-edge">
                    <rect
                        x={0.15}
                        y={0.15}
                        width={PORTRAIT.w - 0.3}
                        height={PORTRAIT.h - 0.3}
                        fill="none"
                        stroke={ruleColor(theme)}
                        strokeWidth={0.3}
                    />
                    <rect
                        x={0.85}
                        y={0.85}
                        width={PORTRAIT.w - 1.7}
                        height={PORTRAIT.h - 1.7}
                        fill="none"
                        stroke={theme.paper}
                        strokeWidth={0.14}
                    />
                </Art>
            )}
        </>
    );
};

/** A strip of paper tape over a corner, Speels. */
const Tape = ({ x, y, turn }: { x: number; y: number; turn: number }) => {
    const { theme } = useRender();
    const w = 6.2;
    const h = 2.2;

    return (
        <Abs
            x={x - w / 2}
            y={y - h / 2}
            w={w}
            h={h}
            slot="tape"
            style={{
                background: withAlpha(
                    mix(theme.paper, theme.secondaryAccent, 0.45),
                    0.8,
                ),
                transform: `rotate(${String(turn)}deg)`,
            }}
        />
    );
};

/** What a style draws under the face of one panel: the cream and rules of Vintage, the tile of Speels. */
const PanelBackdrop = ({
    look,
    seed,
}: {
    look: PawnStyle | undefined;
    seed: number;
}) => {
    const { theme } = useRender();
    const { w } = PAWN_SIZE_MM;
    const h = PANEL_HEIGHT;

    if (look === 'vintage') {
        return (
            <>
                <Abs
                    x={0}
                    y={0}
                    w={w}
                    h={h}
                    style={{ background: vintagePaper(theme.paper) }}
                />
                <VintagePanelRules color={ruleColor(theme)} />
            </>
        );
    }

    if (look === 'playful') {
        return (
            <>
                <Abs
                    x={0}
                    y={0}
                    w={w}
                    h={h}
                    style={{ background: theme.boardBackground }}
                />
                <Art x={0} y={0} w={w} h={h} slot="tile">
                    <path
                        d={wobblyRect(
                            0.55,
                            0.55,
                            w - 1.1,
                            h - 1.1,
                            2.6,
                            seed,
                            0.16,
                        )}
                        fill={theme.paper}
                        stroke={theme.ink}
                        strokeWidth={0.4}
                        strokeLinejoin="round"
                    />
                </Art>
            </>
        );
    }

    return null;
};

/** The double rule of Vintage around a panel, with a diamond in each corner and a double rule between the halves. */
const VintagePanelRules = ({
    color,
    split = true,
}: {
    color: string;
    split?: boolean;
}) => {
    const { w } = PAWN_SIZE_MM;
    const h = PANEL_HEIGHT;
    // Off the cut edge, so a cut a little beside the line still leaves an even frame.
    const outer = 0.75;
    const inner = 1.15;
    const middle = NAME_BOX.x - 0.75;

    return (
        <Art x={0} y={0} w={w} h={h} slot="vintage-rules">
            <rect
                x={outer}
                y={outer}
                width={w - 2 * outer}
                height={h - 2 * outer}
                fill="none"
                stroke={color}
                strokeWidth={0.3}
            />
            <rect
                x={inner}
                y={inner}
                width={w - 2 * inner}
                height={h - 2 * inner}
                fill="none"
                stroke={color}
                strokeWidth={0.1}
            />
            {[
                [outer, outer],
                [w - outer, outer],
                [w - outer, h - outer],
                [outer, h - outer],
            ].map(([cx = 0, cy = 0]) => (
                <path
                    key={`${String(cx)}-${String(cy)}`}
                    d={diamond(cx, cy, 0.6)}
                    fill={color}
                />
            ))}
            {split && (
                <path
                    d={`M${String(middle - 0.25)} 2.6V${String(h - 2.6)}M${String(middle + 0.25)} 2.6V${String(h - 2.6)}`}
                    stroke={color}
                    strokeWidth={0.1}
                />
            )}
        </Art>
    );
};

/** What a style draws around the name: the flourishes of Vintage, the bar of Modern, the confetti of Speels. */
const NameDecor = ({
    look,
    seed,
}: {
    look: PawnStyle | undefined;
    seed: number;
}) => {
    const { theme, style } = useRender();
    const { w } = PAWN_SIZE_MM;
    const h = PANEL_HEIGHT;
    const cx = NAME_BOX.x + NAME_BOX.w / 2;

    if (look === 'vintage') {
        const color = ruleColor(theme);
        const flourish = (y: number) =>
            `M${String(cx - 6.5)} ${String(y)}L${String(cx - 1.3)} ${String(y)}M${String(cx + 1.3)} ${String(y)}L${String(cx + 6.5)} ${String(y)}`;

        return (
            <Art x={0} y={0} w={w} h={h} slot="flourish">
                {[3.1, h - 3.1].map((y) => (
                    <g key={y}>
                        <path
                            d={flourish(y)}
                            stroke={color}
                            strokeWidth={0.14}
                        />
                        <path d={diamond(cx, y, 0.6)} fill={color} />
                        <circle cx={cx - 6.9} cy={y} r={0.22} fill={color} />
                        <circle cx={cx + 6.9} cy={y} r={0.22} fill={color} />
                    </g>
                ))}
            </Art>
        );
    }

    if (look === 'modern') {
        return (
            <Abs
                x={NAME_BOX.x + 0.4}
                y={h - 1.5 - 1.6}
                w={8}
                h={1.6}
                slot="name-bar"
                style={{ background: blockColor(theme) }}
            />
        );
    }

    if (look === 'playful') {
        const colors = confettiColors(theme, style?.groupColors);
        const spots: [number, number, ConfettiPiece['kind']][] = [
            [NAME_BOX.x + 1.4, 2.6, 'dot'],
            [NAME_BOX.x + 6.2, 2.2, 'squiggle'],
            [w - 2.6, 2.9, 'star'],
            [w - 2.4, h - 2.8, 'ring'],
            [NAME_BOX.x + 10.5, h - 2.1, 'dash'],
            [NAME_BOX.x + 1.8, h - 2.6, 'star'],
        ];

        return (
            <Art x={0} y={0} w={w} h={h} slot="confetti">
                {spots.map(([x, y, kind], index) => (
                    <ConfettiShape
                        key={index}
                        piece={{
                            x,
                            y,
                            kind,
                            size: 1.3,
                            color:
                                colors[(index + seed) % colors.length] ??
                                theme.ink,
                            turn: (seed * 37 + index * 53) % 180,
                        }}
                    />
                ))}
            </Art>
        );
    }

    return null;
};

/** The colours of confetti: the accents of the theme and a few street colours. */
const confettiColors = (
    theme: Theme,
    own: Partial<Record<string, string>> | undefined,
): string[] => {
    const street = (id: string, standard: string) =>
        own?.[id] ?? theme.groupColors?.[id] ?? standard;

    return [
        blockColor(theme),
        theme.deckAccent.chance,
        street('yellow', '#F2D200'),
        theme.deckAccent.chest,
        street('green', '#1FA25A'),
    ];
};

const PawnFace = ({ name, photo }: { name: string; photo?: PhotoSource }) => {
    const { w } = PAWN_SIZE_MM;
    const { theme, style } = useRender();
    const look = partStyleOf(style, 'pawns');
    const text = pieceText(look, 'name');
    const seed = seedOf(name);

    // "Full": the photo fills the whole panel and the name sits on a light band at its foot (B124).
    if (photo !== undefined && isFullPhoto(photo)) {
        const bandHeight = 8;
        const playful = look === 'playful';

        return (
            <>
                <PhotoSlot x={0} y={0} w={w} h={PANEL_HEIGHT} photo={photo} />
                {look === 'vintage' && (
                    <VintagePanelRules color={theme.paper} split={false} />
                )}
                <Abs
                    x={playful ? 2 : 0}
                    y={PANEL_HEIGHT - bandHeight - (playful ? 1.2 : 0)}
                    w={playful ? w - 4 : w}
                    h={bandHeight}
                    style={{
                        background: withAlpha(
                            look === 'vintage'
                                ? vintagePaper(theme.paper)
                                : theme.paper,
                            BAND_OPACITY,
                        ),
                        ...(playful
                            ? {
                                  borderRadius: mm(bandHeight / 2),
                                  border: `${mm(0.35)} solid ${theme.ink}`,
                                  boxSizing: 'border-box',
                              }
                            : {}),
                        ...(look === 'modern'
                            ? {
                                  borderTop: `${mm(1.2)} solid ${blockColor(theme)}`,
                                  boxSizing: 'border-box',
                              }
                            : {}),
                        ...(look === 'vintage'
                            ? {
                                  borderTop: `${mm(0.7)} double ${ruleColor(theme)}`,
                                  boxSizing: 'border-box',
                              }
                            : {}),
                    }}
                    slot="name-band"
                />
                <FitText
                    text={name}
                    x={playful ? 5 : 3}
                    y={
                        PANEL_HEIGHT -
                        bandHeight +
                        0.6 -
                        (playful ? 1.2 : 0) +
                        (look === 'modern' ? 0.6 : 0)
                    }
                    w={playful ? w - 10 : w - 6}
                    h={bandHeight - 1.2 - (look === 'modern' ? 0.6 : 0)}
                    maxFontMm={PAWN_NAME_MAX_MM}
                    minFontMm={2}
                    font="heading"
                    {...text}
                    align="center"
                    valign="middle"
                    slot="name"
                />
            </>
        );
    }

    const box = nameBoxOf(look);
    const name_ = (
        <FitText
            text={name}
            {...box}
            maxFontMm={PAWN_NAME_MAX_MM}
            minFontMm={2}
            wrap="words"
            font="heading"
            {...text}
            align={look === 'modern' ? 'left' : 'center'}
            valign={look === 'modern' ? 'bottom' : 'middle'}
            lineHeight={look === 'modern' ? 0.95 : undefined}
            slot="name"
        />
    );

    return (
        <>
            <PanelBackdrop look={look} seed={seed} />
            {photo === undefined ? (
                <Initial name={name} look={look} />
            ) : (
                <Portrait photo={photo} look={look} />
            )}
            <NameDecor look={look} seed={seed} />
            {look === 'playful' ? (
                /* Speels: the name a little turned, as if written on the tile. */
                <Abs
                    x={0}
                    y={0}
                    w={w}
                    h={PANEL_HEIGHT}
                    style={{
                        transform: 'rotate(-3deg)',
                        transformOrigin: `${mm(box.x + box.w / 2)} ${mm(box.y + box.h / 2)}`,
                    }}
                >
                    {name_}
                </Abs>
            ) : (
                name_
            )}
        </>
    );
};

/** One pawn on the sheet, 40 x 55 mm, with its two fold lines. */
export const PawnSheetItem = ({
    name,
    photo,
    ...element
}: PawnSheetItemProps) => {
    const { w, h } = PAWN_SIZE_MM;
    const theme = THEMES[element.theme];

    return (
        <Sheet
            {...element}
            element="pawn"
            widthMm={w}
            heightMm={h}
            background={theme.paper}
        >
            <Abs x={0} y={0} w={w} h={PANEL_HEIGHT}>
                <PawnFace name={name} photo={photo} />
            </Abs>
            <Abs
                x={0}
                y={PANEL_HEIGHT}
                w={w}
                h={PANEL_HEIGHT}
                style={{ transform: 'rotate(180deg)' }}
                slot="back"
            >
                <PawnFace name={name} photo={photo} />
            </Abs>
            <FoldLines />
        </Sheet>
    );
};

const FoldLines = () => {
    const { theme, locale, style } = useRender();
    const { w, h } = PAWN_SIZE_MM;
    const t = STRINGS[locale];
    const look = partStyleOf(style, 'pawns');

    return (
        <>
            <svg
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: mm(w),
                    height: mm(h),
                }}
                viewBox={`0 0 ${w} ${h}`}
                aria-hidden="true"
                data-fold-lines=""
            >
                {[PANEL_HEIGHT, 2 * PANEL_HEIGHT].map((y) => (
                    <line
                        key={y}
                        x1={0}
                        y1={y}
                        x2={w}
                        y2={y}
                        stroke={theme.line}
                        strokeWidth={0.25}
                        strokeDasharray="1.5 1"
                    />
                ))}
            </svg>
            <FitText
                text={t.pawn}
                x={2}
                y={2 * PANEL_HEIGHT + 1}
                w={w - 4}
                h={h - 2 * PANEL_HEIGHT - 2}
                maxFontMm={2.6}
                minFontMm={1.8}
                font="body"
                {...pieceText(look, 'line')}
                align="center"
                // Readable, not a hairline colour: the word was 3.2 : 1 (bug 31, ronde 4).
                color={theme.ink}
            />
        </>
    );
};
