import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { NotePiece, PAPER, type PieceProps } from './table-pieces';

/** Four marks in the corners around a printed thing, as on a proof sheet (B87). */
export const CropMarks = ({
    children,
    className,
    inset = 10,
}: {
    children: ReactNode;
    className?: string;
    inset?: number;
}) => {
    const marks = [
        'top-0 left-0 border-r border-b',
        'top-0 right-0 border-b border-l',
        'bottom-0 left-0 border-t border-r',
        'right-0 bottom-0 border-t border-l',
    ];

    return (
        <div
            className={cn('relative', className)}
            style={{ padding: inset + 4 }}
        >
            {marks.map((classes) => (
                <span
                    key={classes}
                    aria-hidden="true"
                    className={`absolute border-ink ${classes}`}
                    style={{ width: inset, height: inset }}
                />
            ))}
            {children}
        </div>
    );
};

/** A sheet of play money on its crop marks: four notes in two columns. */
export const NoteSheet = ({ width, className }: PieceProps) => {
    const inset = 10;
    const noteWidth = (width - 2 * (inset + 4) - 8) / 2;

    return (
        <CropMarks
            inset={inset}
            className={cn('bg-card shadow-sheet', className)}
        >
            <div className="flex flex-col gap-2">
                {[
                    [5, 20],
                    [50, 100],
                    [10, 500],
                ].map((row) => (
                    <div key={row.join('-')} className="flex gap-2">
                        {row.map((value) => (
                            <NotePiece
                                key={value}
                                value={value}
                                width={noteWidth}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </CropMarks>
    );
};

/** A sticker panel of the board, lettered A to D, with an optional curled corner. */
const PanelPiece = ({
    letter,
    size,
    peel = false,
    className,
    style,
}: {
    letter: string;
    size: number;
    peel?: boolean;
    className?: string;
    style?: CSSProperties;
}) => {
    const cut = peel ? 24 : 0;

    return (
        <div
            aria-hidden="true"
            className={cn('relative', className)}
            style={{ width: size, height: size, ...style }}
        >
            <div
                className="absolute inset-0 flex items-center justify-center border border-line-strong bg-board font-display font-extrabold"
                style={{
                    fontSize: size / 3,
                    clipPath: peel
                        ? `polygon(0 0, ${100 - cut}% 0, 100% ${cut}%, 100% 100%, 0 100%)`
                        : undefined,
                }}
            >
                {letter}
            </div>
            {peel && (
                <svg
                    viewBox="0 0 100 100"
                    className="absolute inset-0 overflow-visible"
                >
                    <polygon
                        points={`${100 - cut},0 100,${cut} ${100 - cut},${cut}`}
                        fill={PAPER}
                        stroke="rgb(27 31 36 / 0.35)"
                        strokeWidth="0.6"
                    />
                </svg>
            )}
        </div>
    );
};

/** A little pile of the four sticker panels. */
export const PanelStack = ({
    size,
    className,
}: {
    size: number;
    className?: string;
}) => {
    const letters = ['D', 'C', 'B', 'A'];
    const rotations = [-6, 4, -3, 2];

    return (
        <div
            aria-hidden="true"
            className={cn('relative', className)}
            style={{ width: size + 24, height: size + 24 }}
        >
            {letters.map((letter, index) => (
                <PanelPiece
                    key={letter}
                    letter={letter}
                    size={size}
                    peel={letter === 'A'}
                    className="absolute shadow-sheet"
                    style={{
                        left: index * 6,
                        top: index * 6,
                        transform: `rotate(${rotations[index] ?? 0}deg)`,
                    }}
                />
            ))}
        </div>
    );
};

/** A sheet of paper with grey text lines, for the legal pages and the FAQ. */
export const TextSheet = ({
    width = 150,
    lines = 9,
    className,
}: {
    width?: number;
    lines?: number;
    className?: string;
}) => {
    return (
        <div
            aria-hidden="true"
            className={cn(
                'flex flex-col gap-2 bg-card p-4 shadow-sheet',
                className,
            )}
            style={{ width, height: width * 1.41 }}
        >
            <div className="h-3 w-2/3 bg-ink" />
            {Array.from({ length: lines }, (_, index) => (
                <div
                    key={index}
                    className="h-1.5 bg-ink/25"
                    style={{ width: `${index % 3 === 2 ? 55 : 100}%` }}
                />
            ))}
        </div>
    );
};
