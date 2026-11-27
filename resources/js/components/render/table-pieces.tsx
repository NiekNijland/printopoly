import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';

import { Banknote } from '@/components/render/banknote';
import { BANKNOTE_SIZE_MM } from '@/components/render/banknote-parts';
import { Board } from '@/components/render/board';
import { BoardSpace } from '@/components/render/board-space';
import { spaceSize } from '@/components/render/board-space';
import { CARD_SIZE_MM, GameCard } from '@/components/render/game-card';
import { TitleDeed } from '@/components/render/title-deed';
import { resolveEdition } from '@/lib/render/edition-resolve';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { sampleEdition } from '@/lib/render/sample-edition';
import { spaceAt, standardEdition } from '@/lib/render/standard-edition';
import type { ThemeId } from '@/lib/render/themes';
import { cn } from '@/lib/utils';

import { Scaled } from './table-scaled';

/**
 * Printed things for the kitchen table (B109): the real renderers drawn small, plus a few
 * flat drawings (die, pawns, scissors). All of it is decoration, hidden from assistive
 * technology, and every size is fixed in px so server and browser render the same.
 */

export const INK = '#1B1F24';
export const PAPER = '#FFFDF7';

const useSample = () => {
    const { locale } = usePage().props;

    return useMemo(() => resolveEdition(sampleEdition(locale)), [locale]);
};

const useCommon = () => {
    const edition = useSample();

    return {
        edition,
        common: {
            theme: edition.theme,
            locale: edition.language,
            currency: edition.currency.id,
        } as const,
    };
};

export type PieceProps = {
    /** Width on the page in px. */
    width: number;
    className?: string;
};

/** The sample board with the edition name on the diagonal. `peel` curls one corner of the sticker back. */
export const BoardPiece = ({
    width,
    name,
    theme,
    peel = false,
    className,
}: PieceProps & { name?: string; theme?: ThemeId; peel?: boolean }) => {
    const { edition, common } = useCommon();
    const profile = edition.boardProfile;
    const spaces = Object.fromEntries(
        edition.spaces
            .filter((space) => space.customized)
            .map((space) => [space.position, { name: space.name }]),
    );
    const board = (
        <Board
            {...common}
            theme={theme ?? common.theme}
            editionName={name ?? edition.name}
            profile={profile}
            spaces={spaces}
        />
    );

    if (!peel) {
        return (
            <Scaled
                widthMm={profile.outer}
                heightMm={profile.outer}
                width={width}
                className={className}
            >
                {board}
            </Scaled>
        );
    }

    const cut = 20;

    return (
        <div
            aria-hidden="true"
            className={cn('relative', className)}
            style={{ width, height: width }}
        >
            {/* The board underneath, plain cardboard. */}
            <div className="absolute inset-0 border border-line-strong bg-board-photo" />
            <Scaled
                widthMm={profile.outer}
                heightMm={profile.outer}
                width={width}
                style={{
                    position: 'absolute',
                    inset: 0,
                    clipPath: `polygon(0 0, ${100 - cut}% 0, 100% ${cut}%, 100% 100%, 0 100%)`,
                }}
            >
                {board}
            </Scaled>
            <svg
                viewBox="0 0 100 100"
                className="pointer-events-none absolute inset-0 overflow-visible"
                style={{ filter: 'drop-shadow(0 2px 2px rgb(27 31 36 / 0.3))' }}
            >
                <polygon
                    points={`${100 - cut},0 100,${cut} ${100 - cut},${cut}`}
                    fill={PAPER}
                    stroke="rgb(27 31 36 / 0.35)"
                    strokeWidth="0.4"
                    strokeLinejoin="round"
                />
                <line
                    x1={100 - cut}
                    y1="0"
                    x2="100"
                    y2={cut}
                    stroke="rgb(27 31 36 / 0.25)"
                    strokeWidth="0.4"
                />
            </svg>
        </div>
    );
};

export type CardKind = 'chance' | 'chest' | 'deed';

/** A Chance card, a Community Chest card or a title deed from the sample edition. */
export const CardPiece = ({
    kind,
    width,
    className,
}: PieceProps & { kind: CardKind }) => {
    const { edition, common } = useCommon();
    const chance = edition.decks?.chance[0];
    const chest = edition.decks?.chest[0];
    const deed = edition.deeds?.[0];

    return (
        <Scaled
            widthMm={CARD_SIZE_MM.width}
            heightMm={CARD_SIZE_MM.height}
            width={width}
            className={className}
        >
            {kind === 'chance' && chance !== undefined && (
                <GameCard
                    {...common}
                    deck="chance"
                    side="front"
                    card={standardEdition.decks.chance[0]}
                    text={chance.text}
                />
            )}
            {kind === 'chest' && chest !== undefined && (
                <GameCard
                    {...common}
                    deck="chest"
                    side="front"
                    card={standardEdition.decks.chest[0]}
                    text={chest.text}
                />
            )}
            {kind === 'deed' && deed !== undefined && (
                <TitleDeed
                    {...common}
                    space={deed.space}
                    side="front"
                    name={deed.name}
                />
            )}
        </Scaled>
    );
};

/** A play money note. */
export const NotePiece = ({
    value,
    width,
    className,
}: PieceProps & { value: number }) => {
    const { common } = useCommon();

    return (
        <Scaled
            widthMm={BANKNOTE_SIZE_MM.w}
            heightMm={BANKNOTE_SIZE_MM.h}
            width={width}
            className={className}
        >
            <Banknote {...common} value={value} />
        </Scaled>
    );
};

/** One street space of the board, upright. */
export const SpacePiece = ({
    position,
    width,
    className,
}: PieceProps & { position: number }) => {
    const { edition, common } = useCommon();
    const space = spaceAt(position);
    const size = spaceSize(space, DEFAULT_BOARD_PROFILE);
    const own = edition.spaces.find(
        (candidate) => candidate.position === position,
    );

    return (
        <Scaled
            widthMm={size.w}
            heightMm={size.h}
            width={width}
            className={className}
        >
            <BoardSpace
                {...common}
                space={space}
                name={own?.customized === true ? own.name : undefined}
            />
        </Scaled>
    );
};

/** The two decks and a deed fanned out, bottom-aligned. */
export const CardFan = ({
    width,
    className,
}: {
    width: number;
    className?: string;
}) => {
    const cardWidth = width * 0.5;
    const cardHeight = (cardWidth * CARD_SIZE_MM.height) / CARD_SIZE_MM.width;
    const fan: { kind: CardKind; rotate: number; left: number; top: number }[] =
        [
            { kind: 'chance', rotate: -14, left: 0, top: 8 },
            { kind: 'deed', rotate: 12, left: width * 0.5, top: 0 },
            { kind: 'chest', rotate: -2, left: width * 0.25, top: 18 },
        ];

    return (
        <div
            aria-hidden="true"
            className={cn('relative', className)}
            style={{ width, height: cardHeight + 30 }}
        >
            {fan.map(({ kind, rotate, left, top }) => (
                <div
                    key={kind}
                    className="absolute origin-bottom shadow-sheet"
                    style={{
                        left,
                        top,
                        width: cardWidth,
                        transform: `rotate(${rotate}deg)`,
                    }}
                >
                    <CardPiece kind={kind} width={cardWidth} />
                </div>
            ))}
        </div>
    );
};

/** A pawn: head, body and foot in flat colour. */
export const Pawn = ({
    color,
    size = 44,
    className,
}: {
    color: string;
    size?: number;
    className?: string;
}) => {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 40 56"
            width={size}
            height={(size * 56) / 40}
            className={className}
        >
            <ellipse
                cx="20"
                cy="52"
                rx="16"
                ry="4"
                fill={color}
                stroke={INK}
                strokeWidth="1.5"
            />
            <path
                d="M12 50 C14 38 16 32 17 26 L23 26 C24 32 26 38 28 50 Z"
                fill={color}
                stroke={INK}
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            <ellipse
                cx="20"
                cy="26"
                rx="9"
                ry="3"
                fill={color}
                stroke={INK}
                strokeWidth="1.5"
            />
            <circle
                cx="20"
                cy="14"
                r="9"
                fill={color}
                stroke={INK}
                strokeWidth="1.5"
            />
            <circle cx="17" cy="11" r="2.5" fill="white" opacity="0.6" />
        </svg>
    );
};

/** A die showing five, in paper white with ink pips. */
export const Die = ({
    size = 40,
    className,
}: {
    size?: number;
    className?: string;
}) => {
    const pips: [number, number][] = [
        [14, 14],
        [34, 14],
        [24, 24],
        [14, 34],
        [34, 34],
    ];

    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 48 48"
            width={size}
            height={size}
            className={className}
        >
            <rect
                x="2"
                y="2"
                width="44"
                height="44"
                rx="8"
                fill={PAPER}
                stroke={INK}
                strokeWidth="2"
            />
            {pips.map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="3.4" fill={INK} />
            ))}
        </svg>
    );
};
