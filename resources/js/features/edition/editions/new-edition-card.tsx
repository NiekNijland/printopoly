import { Link } from '@inertiajs/react';
import { useMemo } from 'react';

import { Board } from '@/components/render/board';
import { GameCard } from '@/components/render/game-card';
import { Scaled } from '@/components/render/table-scaled';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/use-translation';
import {
    templateEdition,
    type TemplateId,
} from '@/lib/render/edition-templates';
import type { ThemeId } from '@/lib/render/edition-types';
import type { BoardProfile } from '@/lib/render/print-board';
import { cn } from '@/lib/utils';
import { sample as editionsSample } from '@/routes/editions';
import type { CurrencyId, Locale } from '@/types/game';

import { useTemplatePreview } from './template-picker';

type NewEditionCardProps = {
    /** Interface language, for the link to the template. */
    locale: Locale;
    template: TemplateId | null;
    /** Leeg (B259): the board without names, the card without text. */
    empty?: boolean;
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
    /**
     * Whether the bar at the bottom of a phone or tablet is in: only once the starting points were in sight
     * (R5-21). From a laptop up the card stands next to them and is always there.
     */
    barShown?: boolean;
};

type NewEditionPreviewProps = Pick<
    NewEditionCardProps,
    'template' | 'shownName' | 'language' | 'currency' | 'theme' | 'profile'
> & { empty: boolean };

const NewEditionPreview = ({
    template,
    empty,
    shownName,
    language,
    currency,
    theme,
    profile,
}: NewEditionPreviewProps) => {
    const edition = useMemo(
        () =>
            template === null ? undefined : templateEdition(template, language),
        [template, language],
    );
    const { spaces, chance, standard } = useTemplatePreview(edition, empty);

    return (
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
    );
};

const NewEditionLinks = ({
    locale,
    template,
}: Pick<NewEditionCardProps, 'locale' | 'template'>) => {
    const t = useTranslation();

    return (
        <>
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
        </>
    );
};

/**
 * The card next to the form (on a tablet and a phone a bar stuck to the bottom of the screen): the board of what is
 * chosen, the name and the button, so the name and the button are always in reach together (B150; vindbaarheid,
 * point 9). The name field has no autofocus, so the first Tab still reaches the skip link (round 4).
 */
export const NewEditionCard = ({
    locale,
    template,
    empty = false,
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
    barShown = true,
}: NewEditionCardProps) => {
    const t = useTranslation();

    return (
        <aside
            aria-label={t('edition.card_label')}
            data-bar-shown={barShown}
            className={cn(
                'fixed inset-x-0 bottom-0 z-20 flex max-w-full flex-col gap-2 border-t-2 border-ink bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
                // Slides up from below once the starting points were seen; hidden it is out of reach for Tab too.
                'motion-safe:transition-transform motion-safe:duration-300',
                !barShown && 'max-lg:invisible max-lg:translate-y-full',
                // Tablet: one line, the choice on the left, then the name and the button (bug 15).
                'md:flex-row md:flex-wrap md:items-center md:justify-end md:gap-x-4 md:px-8',
                'lg:sticky lg:top-24 lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-4 lg:self-start lg:rounded-control lg:border-2 lg:p-5 lg:shadow-paper',
            )}
        >
            <NewEditionPreview
                template={template}
                empty={empty}
                shownName={shownName}
                language={language}
                currency={currency}
                theme={theme}
                profile={profile}
            />
            {/* On a phone too: what the button makes, right above it (R5-21). */}
            <p className="m-0 min-w-0 truncate text-sm text-ink-soft md:flex-1 lg:flex-none lg:text-center lg:whitespace-normal">
                <span className="lg:hidden">{t('edition.start_with')} </span>
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
            <NewEditionLinks locale={locale} template={template} />
        </aside>
    );
};
