import { usePage } from '@inertiajs/react';
import { useState } from 'react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChoiceLine } from '@/features/edition/editions/choice-line';
import {
    CurrencyChoice,
    ThemeChoice,
    type EditionFieldValues,
} from '@/features/edition/editions/edition-choices';
import { useTranslation } from '@/hooks/use-translation';
import { messages } from '@/lib/render/edition-strings';
import type { ThemeId } from '@/lib/render/edition-types';
import type { CurrencyId, Locale } from '@/types/game';

const LANGUAGES: readonly Locale[] = ['nl', 'en'];

export const LanguageLine = ({
    language,
    onLanguage,
}: {
    language: Locale;
    onLanguage: (language: Locale) => void;
}) => {
    const t = useTranslation();
    const { locale } = usePage().props;
    const m = messages[locale];

    return (
        <div
            role="group"
            aria-labelledby="new-language"
            className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 rounded-control border-2 border-ink bg-card px-4 py-2"
        >
            <span
                id="new-language"
                className="font-display text-lg font-extrabold"
            >
                {t('edition.language')}
            </span>
            <ToggleGroup
                type="single"
                variant="outline"
                value={language}
                onValueChange={(next) => {
                    // A click on the chosen language would clear the group; one is always chosen.
                    const choice = LANGUAGES.find((id) => id === next);
                    if (choice !== undefined) {
                        onLanguage(choice);
                    }
                }}
                aria-label={t('edition.language')}
                className="ml-auto"
            >
                {LANGUAGES.map((id) => (
                    <ToggleGroupItem
                        key={id}
                        value={id}
                        lang={id}
                        className="min-h-10 px-4"
                    >
                        {m.languageName[id]}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>
        </div>
    );
};

export const ThemeAndCurrency = ({
    values,
    currency,
    remembered,
    shownName,
    onTheme,
    onCurrency,
}: {
    values: Pick<EditionFieldValues, 'theme' | 'language'>;
    currency: CurrencyId;
    remembered: boolean;
    shownName: string;
    onTheme: (theme: ThemeId) => void;
    onCurrency: (currency: CurrencyId) => void;
}) => {
    const t = useTranslation();
    const { locale } = usePage().props;
    const m = messages[locale];
    const [open, setOpen] = useState<'theme' | 'currency' | null>(null);
    const toggle = (line: 'theme' | 'currency'): void =>
        setOpen(open === line ? null : line);

    return (
        <>
            <ChoiceLine
                title={t('edition.theme_line')}
                summary={m.themeName[values.theme]}
                open={open === 'theme'}
                onToggle={() => toggle('theme')}
                changeLabel={t('edition.change')}
                collapseLabel={t('edition.collapse')}
            >
                <ThemeChoice
                    theme={values.theme}
                    name={shownName}
                    language={values.language}
                    currency={currency}
                    interfaceLanguage={locale}
                    idPrefix="new"
                    onTheme={onTheme}
                />
            </ChoiceLine>
            <ChoiceLine
                title={t('edition.currency_line')}
                summary={
                    remembered
                        ? t('edition.currency_remembered', {
                              currency: t(`edition.currency_${currency}`),
                          })
                        : t(`edition.currency_${currency}`)
                }
                open={open === 'currency'}
                onToggle={() => toggle('currency')}
                changeLabel={t('edition.change')}
                collapseLabel={t('edition.collapse')}
            >
                <CurrencyChoice
                    currency={currency}
                    language={values.language}
                    idPrefix="new"
                    onCurrency={onCurrency}
                />
            </ChoiceLine>
        </>
    );
};
