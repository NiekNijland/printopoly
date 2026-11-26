import { Link } from '@inertiajs/react';

import { Banknote } from '@/components/render/banknote';
import { GameCard } from '@/components/render/game-card';
import { TitleDeed } from '@/components/render/title-deed';
import { Button } from '@/components/ui/button';
import { TemplateStrip } from '@/features/edition/editions/template-strip';
import { useTranslation } from '@/hooks/use-translation';
import { deedsFor } from '@/lib/render/standard-edition';
import {
    create as editionsCreate,
    sample as editionsSample,
} from '@/routes/editions';
import type { Locale } from '@/types/game';

const PX_PER_MM = 96 / 25.4;

/** A printed piece lying on the table: drawn at true size in mm, scaled down. */
function Piece({
    widthMm,
    heightMm,
    scale,
    className,
    children,
}: {
    widthMm: number;
    heightMm: number;
    scale: number;
    className: string;
    children: React.ReactNode;
}) {
    return (
        <div
            aria-hidden="true"
            className={className}
            style={{
                width: widthMm * PX_PER_MM * scale,
                height: heightMm * PX_PER_MM * scale,
            }}
        >
            <div
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: '0 0',
                    width: `${widthMm}mm`,
                    height: `${heightMm}mm`,
                }}
            >
                {children}
            </div>
        </div>
    );
}

/** Mijn edities without editions: printed matter on the table and two ways to start (B104). */
export function EmptyState({ locale }: { locale: Locale }) {
    const t = useTranslation();
    const deed = deedsFor()[0];

    return (
        <div className="flex flex-col items-center gap-8 rounded-control border-2 border-ink bg-table px-4 py-12 text-center md:py-16">
            <div className="relative h-72 w-full max-w-md" aria-hidden="true">
                <Piece
                    widthMm={63}
                    heightMm={88}
                    scale={0.62}
                    className="absolute top-4 left-[6%] -rotate-[8deg] shadow-paper"
                >
                    <GameCard
                        theme="classic"
                        locale={locale}
                        deck="chest"
                        side="front"
                        card={undefined}
                        text=""
                    />
                </Piece>
                {deed !== undefined && (
                    <Piece
                        widthMm={63}
                        heightMm={88}
                        scale={0.62}
                        className="absolute top-0 left-[30%] rotate-[3deg] shadow-paper"
                    >
                        <TitleDeed
                            theme="classic"
                            locale={locale}
                            space={deed}
                            side="front"
                        />
                    </Piece>
                )}
                <Piece
                    widthMm={130}
                    heightMm={60}
                    scale={0.58}
                    className="absolute top-32 right-0 rotate-[6deg] shadow-paper"
                >
                    <Banknote theme="classic" locale={locale} value={50} />
                </Piece>
            </div>
            <div className="flex flex-col gap-2">
                <p className="m-0 font-display text-2xl font-extrabold">
                    {t('editions.empty')}
                </p>
                <p className="m-0 max-w-[34em] text-ink-soft">
                    {t('editions.empty_body')}
                </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild>
                    <Link href={editionsCreate(locale)}>
                        {t('editions.new')}
                    </Link>
                </Button>
                <Button variant="secondary" asChild>
                    <Link href={editionsSample(locale)}>
                        {t('editions.see_sample')}
                    </Link>
                </Button>
            </div>
            <TemplateStrip
                locale={locale}
                className="w-full max-w-3xl border-t-2 border-ink pt-6 text-left"
            />
        </div>
    );
}
