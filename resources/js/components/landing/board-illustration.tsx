import type { CSSProperties } from 'react';

import { useTranslation } from '@/hooks/use-translation';

/**
 * A static drawing of a board with a fan of cards, for the landing page
 * (docs/design/Main.dc.html). It is a stand-in: the real board renderer
 * replaces it later.
 */

type Cell = 'corner' | 'plain' | { band: string };

const GROUP = {
    brown: 'bg-print-brown',
    lightBlue: 'bg-print-light-blue',
    pink: 'bg-print-pink',
    orange: 'bg-print-orange',
    red: 'bg-print-red',
    yellow: 'bg-print-yellow',
    green: 'bg-print-green',
    darkBlue: 'bg-print-dark-blue',
} as const;

const cell = (group: keyof typeof GROUP): Cell => ({ band: GROUP[group] });

/** The 40 spaces, counted from the bottom-right corner along the bottom row. */
const SPACES: Cell[] = [
    'corner',
    cell('brown'),
    'plain',
    cell('brown'),
    'plain',
    'plain',
    cell('lightBlue'),
    'plain',
    cell('lightBlue'),
    cell('lightBlue'),
    'corner',
    cell('pink'),
    'plain',
    cell('pink'),
    cell('pink'),
    'plain',
    cell('orange'),
    'plain',
    cell('orange'),
    cell('orange'),
    'corner',
    cell('red'),
    'plain',
    cell('red'),
    cell('red'),
    'plain',
    cell('yellow'),
    cell('yellow'),
    'plain',
    cell('yellow'),
    'corner',
    cell('green'),
    cell('green'),
    'plain',
    cell('green'),
    'plain',
    'plain',
    cell('darkBlue'),
    'plain',
    cell('darkBlue'),
];

type Side = 'bottom' | 'left' | 'top' | 'right';

/** Where a space sits on the 11 x 11 grid, and which side faces the middle. */
function place(index: number): { row: number; column: number; side: Side } {
    if (index <= 10) {
        return { row: 11, column: 11 - index, side: 'bottom' };
    }

    if (index <= 20) {
        return { row: 11 - (index - 10), column: 1, side: 'left' };
    }

    if (index <= 30) {
        return { row: 1, column: 1 + (index - 20), side: 'top' };
    }

    return { row: 1 + (index - 30), column: 11, side: 'right' };
}

const BAND_POSITION: Record<Side, string> = {
    bottom: 'inset-x-0 top-0 h-1/5',
    left: 'inset-y-0 right-0 w-1/5',
    top: 'inset-x-0 bottom-0 h-1/5',
    right: 'inset-y-0 left-0 w-1/5',
};

const CROP_MARKS = [
    'top-0 left-0 border-r border-b',
    'top-0 right-0 border-b border-l',
    'bottom-0 left-0 border-t border-r',
    'right-0 bottom-0 border-t border-l',
];

export function BoardIllustration() {
    const t = useTranslation();

    return (
        <div className="relative p-6">
            {CROP_MARKS.map((classes) => (
                <div
                    key={classes}
                    aria-hidden="true"
                    className={`absolute size-4 border-ink ${classes}`}
                />
            ))}

            <div className="relative aspect-square w-[min(480px,calc(100vw-112px))]">
                <div className="grid size-full grid-cols-[1.65fr_repeat(9,minmax(0,1fr))_1.65fr] grid-rows-[1.65fr_repeat(9,minmax(0,1fr))_1.65fr] border-2 border-ink bg-board">
                    {SPACES.map((space, index) => {
                        const { row, column, side } = place(index);
                        const style: CSSProperties = {
                            gridRow: row,
                            gridColumn: column,
                        };

                        return (
                            <div
                                key={index}
                                style={style}
                                className={`relative border-[0.5px] border-ink/50 ${space === 'corner' ? 'bg-board-deep' : ''}`}
                            >
                                {typeof space === 'object' && (
                                    <div
                                        className={`absolute ${BAND_POSITION[side]} ${space.band}`}
                                    />
                                )}
                            </div>
                        );
                    })}
                    <div className="col-span-9 col-start-2 row-span-9 row-start-2 flex items-center justify-center">
                        <span className="-rotate-45 font-display text-[clamp(20px,4vw,36px)] leading-none font-extrabold">
                            {t('illustration.edition_name')}
                        </span>
                    </div>
                </div>

                <div className="absolute -right-[8%] -bottom-[10%] hidden items-end md:flex">
                    <div className="h-32 w-23 translate-x-6 -rotate-8 rounded-[8px] border border-line-strong bg-print-chance p-2.5 font-display text-sm font-extrabold shadow-print">
                        {t('illustration.chance')}
                    </div>
                    <div className="h-32 w-23 translate-x-3 rounded-[8px] border border-line-strong bg-print-chest p-2.5 font-display text-xs leading-[1.1] font-extrabold shadow-print">
                        {t('illustration.chest')}
                    </div>
                    <div className="h-32 w-23 rotate-8 overflow-hidden rounded-[8px] border border-line-strong bg-card shadow-print">
                        <div className="h-7 bg-print-brown" />
                        <div className="px-2 py-1.5 font-display text-[11px] leading-[1.1] font-extrabold">
                            {t('illustration.deed')}
                        </div>
                        <div className="mx-2 h-9 bg-board-photo" />
                    </div>
                </div>
            </div>
        </div>
    );
}
