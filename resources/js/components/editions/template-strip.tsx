import { Link } from '@inertiajs/react';

import { GameCard } from '@/components/render';
import { Scaled } from '@/components/table/scaled';
import { templateEdition, templates } from '@/data/templates';
import { useTranslation } from '@/hooks/use-translation';
import type { Locale } from '@/lib/game/types';
import { cn } from '@/lib/utils';
import { create as editionsCreate } from '@/routes/editions';

import { TILE_TONES } from './template-picker';

interface TemplateStripProps {
    locale: Locale;
    className?: string;
}

/** "Of begin met een sjabloon": a small strip of starting points with a card each, linking to the new edition screen (B127). */
export function TemplateStrip({ locale, className }: TemplateStripProps) {
    const t = useTranslation();
    const all = templates(locale);

    return (
        <section aria-label={t('templates.strip_title')} className={className}>
            <h2 className="m-0 mb-3 font-display text-xl font-extrabold">
                {t('templates.strip_title')}
            </h2>
            <ul className="m-0 -mx-4 flex snap-x scroll-pl-4 list-none gap-3 overflow-x-auto px-4 pt-1 pb-3 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
                {all.map((item, index) => {
                    const edition = templateEdition(item.id, locale);
                    const card = edition?.elements['card.chance.07'];

                    return (
                        <li key={item.id} className="shrink-0 snap-start">
                            <Link
                                href={editionsCreate(locale, {
                                    query: { template: item.id },
                                })}
                                aria-label={t('templates.start_with', {
                                    name: item.label,
                                })}
                                className={cn(
                                    'flex min-h-11 items-center gap-3 rounded-control border-2 border-ink py-2 pr-4 pl-3 font-semibold no-underline hover:underline',
                                    TILE_TONES[index % 8],
                                )}
                            >
                                <Scaled
                                    widthMm={63}
                                    heightMm={88}
                                    width={34}
                                    className="shadow-paper"
                                    style={{
                                        transform: `rotate(${index % 2 === 0 ? -6 : 6}deg)`,
                                    }}
                                >
                                    <GameCard
                                        theme={edition?.theme ?? 'classic'}
                                        locale={locale}
                                        deck={
                                            index % 2 === 0 ? 'chance' : 'chest'
                                        }
                                        side="front"
                                        text={card?.text ?? ''}
                                        amount={card?.amount}
                                    />
                                </Scaled>
                                <span>{item.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
