import { Link } from '@inertiajs/react';
import { useMemo } from 'react';

import { Board, GameCard } from '@/components/render';
import { Scaled } from '@/components/table/scaled';
import { Button } from '@/components/ui/button';
import { templateEdition, type TemplateId } from '@/data/templates';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';
import type { ThemeId } from '@/lib/edition/types';
import { standardEdition } from '@/lib/game/standard-edition';
import type { CurrencyId, Locale } from '@/lib/game/types';
import type { BoardProfile } from '@/lib/print/board';
import { cn } from '@/lib/utils';
import { sample as editionsSample } from '@/routes/editions';

import { templateSpaces } from './template-picker';

interface NewEditionCardProps {
    /** Interface language, for the link to the template. */
    locale: Locale;
    template: TemplateId | null;
    /** The label of the starting point, such as "Je dorp of wijk". */
    startLabel: string;
    name: string;
    language: Locale;
    currency: CurrencyId;
    theme: ThemeId;
    themeLabel: string;
    partCount: number;
    profile: BoardProfile;
    busy: boolean;
    disabled: boolean;
    failed: boolean;
}

/**
 * The card next to the form (below it on a phone, stuck to the bottom of the screen): the board of what is chosen
 * and the button, so the button is always in reach (B150).
 */
export function NewEditionCard({
    locale,
    template,
    startLabel,
    name,
    language,
    currency,
    theme,
    themeLabel,
    partCount,
    profile,
    busy,
    disabled,
    failed,
}: NewEditionCardProps) {
    const t = useTranslation();
    const tc = useTranslationChoice();
    const edition = useMemo(
        () =>
            template === null ? undefined : templateEdition(template, language),
        [template, language],
    );
    const spaces = useMemo(() => templateSpaces(edition), [edition]);
    const chance = edition?.elements['card.chance.07'];
    const standard = standardEdition.decks.chance[6];

    return (
        <aside
            aria-label={t('edition.card_label')}
            className={cn(
                'fixed inset-x-0 bottom-0 z-20 flex max-w-full flex-col gap-3 border-t-2 border-ink bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
                // Tablet: one line, the choice on the left and the button at its own width on the right (bug 15).
                'md:flex-row md:flex-wrap md:items-center md:justify-end md:gap-x-6 md:px-8',
                'lg:sticky lg:top-24 lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-4 lg:self-start lg:rounded-control lg:border-2 lg:p-5 lg:shadow-paper',
            )}
        >
            <div
                aria-hidden="true"
                className="pointer-events-none relative hidden h-72 items-center justify-center overflow-hidden rounded-control bg-table lg:flex"
            >
                <Scaled
                    widthMm={profile.outer}
                    heightMm={profile.outer}
                    width={210}
                    className="shadow-sheet"
                    style={{ transform: 'rotate(-4deg)' }}
                >
                    <Board
                        theme={theme}
                        locale={language}
                        currency={currency}
                        editionName={name === '' ? ' ' : name}
                        profile={profile}
                        spaces={spaces}
                    />
                </Scaled>
                <Scaled
                    widthMm={63}
                    heightMm={88}
                    width={78}
                    className="absolute right-3 bottom-4 shadow-sheet"
                    style={{ transform: 'rotate(8deg)' }}
                >
                    <GameCard
                        theme={theme}
                        locale={language}
                        currency={currency}
                        deck="chance"
                        side="front"
                        card={chance === undefined ? standard : undefined}
                        text={chance?.text}
                        amount={chance?.amount}
                    />
                </Scaled>
            </div>
            <p className="m-0 hidden min-w-0 text-sm text-ink-soft md:block md:flex-1 md:truncate lg:flex-none lg:text-center lg:whitespace-normal">
                <strong className="text-ink">{startLabel}</strong>
                {' · '}
                {themeLabel}
                {' · '}
                {tc('edition.card_parts', partCount)}
            </p>
            {failed && (
                <p
                    role="alert"
                    className="m-0 text-sm text-press md:basis-full lg:basis-auto"
                >
                    {t('edition.create_failed')}
                </p>
            )}
            <Button
                type="submit"
                disabled={disabled || busy}
                aria-busy={busy}
                className="w-full md:w-auto md:min-w-64 lg:w-full"
            >
                {busy ? t('edition.submitting') : t('edition.submit')}
            </Button>
            {template !== null && (
                <Link
                    href={editionsSample(locale, {
                        query: { template },
                    })}
                    className="hidden min-h-11 items-center justify-center text-sm font-semibold underline underline-offset-4 hover:text-press lg:inline-flex"
                >
                    {t('templates.preview')}
                </Link>
            )}
            <p className="m-0 hidden text-center text-xs text-ink-soft lg:block">
                {t('edition.storage_note')}
            </p>
        </aside>
    );
}
