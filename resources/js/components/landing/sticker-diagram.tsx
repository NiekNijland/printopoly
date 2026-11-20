import type { CSSProperties } from 'react';

import { BankCard } from '@/components/table/pieces';

const PANELS = ['A', 'B', 'C', 'D'];

/** The board in four panels with a free strip along the folds (Main.dc.html), and a bank card to press them on. */
export function StickerDiagram({ label }: { label: string }) {
    return (
        <div
            role="img"
            aria-label={label}
            className="relative aspect-square w-full max-w-90 border-2 border-ink bg-card shadow-sheet md:flex-[0_1_360px]"
        >
            <div className="absolute inset-2 grid grid-cols-2 grid-rows-2 gap-2">
                {PANELS.map((panel) => (
                    <div
                        key={panel}
                        className="flex items-center justify-center bg-board font-display text-3xl font-extrabold"
                    >
                        {panel}
                    </div>
                ))}
            </div>
            <div
                aria-hidden="true"
                className="absolute -top-3 -bottom-3 left-1/2 border-l-2 border-dashed border-press"
            />
            <div
                aria-hidden="true"
                className="absolute top-1/2 -right-3 -left-3 border-t-2 border-dashed border-press"
            />
            <div
                aria-hidden="true"
                className="table-item absolute -right-4 -bottom-6 z-10"
                style={{ '--rot': '-12deg' } as CSSProperties}
            >
                <BankCard width={110} className="paper-shadow" />
            </div>
        </div>
    );
}
