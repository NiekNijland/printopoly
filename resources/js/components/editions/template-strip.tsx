import { Link } from '@inertiajs/react';

import { GameCard } from '@/components/render';
import { Scaled } from '@/components/table/scaled';
import { templateEdition, templates } from '@/data/templates';
import { useTranslation } from '@/hooks/use-translation';
import type { ThemeId } from '@/lib/edition/types';
import { standardEdition } from '@/lib/game/standard-edition';
import type { Locale } from '@/lib/game/types';
import { cn } from '@/lib/utils';
import { create as editionsCreate } from '@/routes/editions';

import { TILE_TONES } from './template-picker';

interface TemplateStripProps {
    locale: Locale;
    className?: string;
}

interface StripItem {
    id: string;
    label: string;
    ariaLabel: string;
    href: ReturnType<typeof editionsCreate>;
    theme: ThemeId;
    text?: string;
    amount?: number;
    /** The standard card, for the blank start. */
    standard?: boolean;
}

/**
 * "Begin met…": the starting points as small tiles with a card each, linking to the new edition screen (B127). The
 * same eight as on that screen, blank first and in the same colours: four to a row where there is room, two on a
 * tablet, and a strip to swipe on a phone.
 */
export function TemplateStrip({ locale, className }: TemplateStripProps) {
    const t = useTranslation();
    const items: StripItem[] = [
        {
            id: 'blank',
            label: t('templates.blank'),
            ariaLabel: t('templates.start_blank'),
            href: editionsCreate(locale),
            theme: 'classic' as const,
            standard: true,
        },
        ...templates(locale).map((item) => {
            const edition = templateEdition(item.id, locale);
            const card = edition?.elements['card.chance.07'];

            return {
                id: item.id,
                label: item.label,
                ariaLabel: t('templates.start_with', { name: item.label }),
                href: editionsCreate(locale, {
                    query: { template: item.id },
                }),
                theme: edition?.theme ?? 'classic',
                text: card?.text ?? '',
                amount: card?.amount,
            };
        }),
    ];

    return (
        <section
            aria-label={t('templates.title')}
            className={cn('@container', className)}
        >
            <h2 className="m-0 mb-3 font-display text-xl font-extrabold">
                {t('templates.title')}
            </h2>
            <ul
                data-template-strip
                className="m-0 -mx-4 flex snap-x scroll-pl-4 list-none gap-3 overflow-x-auto px-4 pt-1 pb-3 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 @4xl:grid-cols-4"
            >
                {items.map((item, index) => (
                    <li key={item.id} className="shrink-0 snap-start">
                        <Link
                            href={item.href}
                            aria-label={item.ariaLabel}
                            className={cn(
                                'flex h-full min-h-11 items-center gap-3 rounded-control border-2 border-ink py-2 pr-4 pl-3 font-semibold no-underline hover:underline',
                                TILE_TONES[index % 8],
                            )}
                        >
                            <Scaled
                                widthMm={63}
                                heightMm={88}
                                width={34}
                                className="shrink-0 shadow-paper"
                                style={{
                                    transform: `rotate(${index % 2 === 0 ? -6 : 6}deg)`,
                                }}
                            >
                                <GameCard
                                    theme={item.theme}
                                    locale={locale}
                                    deck={index % 2 === 0 ? 'chance' : 'chest'}
                                    side="front"
                                    card={
                                        item.standard === true
                                            ? standardEdition.decks.chance[6]
                                            : undefined
                                    }
                                    text={item.text}
                                    amount={item.amount}
                                />
                            </Scaled>
                            <span>{item.label}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
