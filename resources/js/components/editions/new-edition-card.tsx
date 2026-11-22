import { Link } from '@inertiajs/react';
import { useMemo } from 'react';

import { Board, GameCard } from '@/components/render';
import { Scaled } from '@/components/table/scaled';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { templateEdition, type TemplateId } from '@/data/templates';
import { useTranslation } from '@/hooks/use-translation';
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
    /** The label of the starting point, such as "Dorp of wijk". */
    startLabel: string;
    /** The name in the field. */
    name: string;
    /** The name on the miniature board, a moment behind the field while typing. */
    shownName: string;
    onName: (name: string) => void;
    language: Locale;
    currency: CurrencyId;
    theme: ThemeId;
    themeLabel: string;
    profile: BoardProfile;
    busy: boolean;
    disabled: boolean;
    failed: boolean;
}

/**
 * The card next to the form (on a tablet and a phone a bar stuck to the bottom of the screen): the board of what is
 * chosen, the name and the button, so the name and the button are always in reach together (B150; vindbaarheid,
 * point 9). The name field has no autofocus, so the first Tab still reaches the skip link (round 4).
 */
export function NewEditionCard({
    locale,
    template,
    startLabel,
    name,
    shownName,
    onName,
    language,
    currency,
    theme,
    themeLabel,
    profile,
    busy,
    disabled,
    failed,
}: NewEditionCardProps) {
    const t = useTranslation();
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
                'fixed inset-x-0 bottom-0 z-20 flex max-w-full flex-col gap-2 border-t-2 border-ink bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
                // Tablet: one line, the choice on the left, then the name and the button (bug 15).
                'md:flex-row md:flex-wrap md:items-center md:justify-end md:gap-x-4 md:px-8',
                'lg:sticky lg:top-24 lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-4 lg:self-start lg:rounded-control lg:border-2 lg:p-5 lg:shadow-paper',
            )}
        >
            <div
                aria-hidden="true"
                className="pointer-events-none relative hidden h-64 items-center justify-center overflow-hidden rounded-control bg-table lg:flex"
            >
                <Scaled
                    widthMm={profile.outer}
                    heightMm={profile.outer}
                    width={200}
                    className="shadow-sheet"
                    style={{ transform: 'rotate(-4deg)' }}
                >
                    <Board
                        theme={theme}
                        locale={language}
                        currency={currency}
                        editionName={shownName === '' ? ' ' : shownName}
                        profile={profile}
                        spaces={spaces}
                    />
                </Scaled>
                <Scaled
                    widthMm={63}
                    heightMm={88}
                    width={74}
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
            </p>
            <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold md:w-64 lg:w-auto">
                <span className="sr-only lg:not-sr-only">
                    {t('edition.name_new')}
                </span>
                <Input
                    value={name}
                    onChange={(event) => onName(event.target.value)}
                    autoComplete="off"
                    enterKeyHint="go"
                />
            </label>
            {failed && (
                <p
                    role="alert"
                    className="m-0 text-sm text-press md:order-last md:basis-full lg:order-none lg:basis-auto"
                >
                    {t('edition.create_failed')}
                </p>
            )}
            <Button
                type="submit"
                disabled={disabled || busy}
                aria-busy={busy}
                className="w-full md:w-auto md:min-w-48 lg:w-full"
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
