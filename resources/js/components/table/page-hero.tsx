import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { PageArt, type PageArtName } from './page-art';

export type Tone = 'board' | 'chance' | 'chest';

/** Band colours from the palette (B83, B89): board green, light cyan, light magenta. */
export const TONE_CLASS: Record<Tone, string> = {
    board: 'bg-board',
    chance: 'bg-print-chance',
    chest: 'bg-print-chest',
};

interface PageHeroProps {
    tone: Tone;
    art: PageArtName;
    title: string;
    /** A lower band with a smaller drawing, for pages with a form. */
    compact?: boolean;
    /**
     * Without the drawing on a phone, so the form starts in the first screen. Nieuwe editie: on 360 px the
     * templates sat below a screen of drawing, under the button that makes a blank edition (R5-21).
     */
    artFromTablet?: boolean;
    children?: ReactNode;
}

/**
 * The top of a public page: a colour band with the title and a drawing of printed things
 * lying on the table (B109).
 */
export function PageHero({
    tone,
    art,
    title,
    compact = false,
    artFromTablet = false,
    children,
}: PageHeroProps) {
    return (
        <section className={cn(TONE_CLASS[tone])}>
            <div
                className={cn(
                    'mx-auto flex max-w-content flex-wrap items-center gap-x-16 gap-y-6 px-4 md:px-8',
                    compact ? 'md:py-8' : 'md:py-16',
                    artFromTablet ? 'py-6' : 'py-8',
                )}
            >
                <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-4">
                    <h1 className="m-0 font-display text-[40px] leading-[1.05] font-extrabold">
                        {title}
                    </h1>
                    {children}
                </div>
                <div
                    className={cn(
                        'min-w-0 flex-[1_1_320px]',
                        compact && 'md:max-w-[280px]',
                        artFromTablet && 'max-md:hidden',
                    )}
                >
                    <PageArt name={art} />
                </div>
            </div>
        </section>
    );
}
