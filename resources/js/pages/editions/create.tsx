import { Head, router, usePage } from '@inertiajs/react';
import { useDeferredValue, useEffect, useState, type FormEvent } from 'react';

import { ChoiceLine } from '@/components/editions/choice-line';
import {
    CurrencyChoice,
    ThemeChoice,
    type EditionFieldValues,
} from '@/components/editions/edition-choices';
import { NewEditionCard } from '@/components/editions/new-edition-card';
import {
    TemplatePicker,
    type TemplateChoice,
} from '@/components/editions/template-picker';
import { PageHero } from '@/components/table/page-hero';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { template, templateEdition } from '@/data/templates';
import { useServices } from '@/hooks/use-editions';
import { useTranslation } from '@/hooks/use-translation';
import { messages } from '@/lib/edition/strings';
import {
    readLastCurrency,
    rememberCurrency,
} from '@/lib/edition/last-currency';
import { DEFAULT_PARTS, isOfferedTemplate } from '@/lib/edition/types';
import { defaultCurrency } from '@/lib/game/currency';
import type { Locale } from '@/lib/game/types';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import { show as editorShow } from '@/routes/editor';

/**
 * The values a starting point fills in: name and theme. `null` is the blank edition. The parts are no choice here
 * (B198): every new edition starts with the same set, board and cards (B225), and the print page changes it.
 */
function startValues(
    choice: TemplateChoice,
    language: Locale,
    blankName: string,
): Pick<EditionFieldValues, 'name' | 'theme' | 'parts'> {
    const data = choice === null ? undefined : template(choice, language);

    return {
        name: data?.name ?? blankName,
        theme: data?.theme ?? 'classic',
        parts: { ...DEFAULT_PARTS },
    };
}

const LANGUAGES: readonly Locale[] = ['nl', 'en'];

/**
 * The new edition screen (B72, B127, B150, B198, B201): pick a starting point, check the language, theme and
 * currency, and give it a name next to the button. The theme and the currency come with the starting point and the
 * language, and stay folded until you change them.
 */
export default function EditionsCreate({
    template: templateParam = null,
}: {
    template?: string | null;
}) {
    const t = useTranslation();
    const { locale } = usePage().props;
    const { repository } = useServices();
    const blankName = t('edition.default_name');
    // Only the seven starts on offer; a link to a hidden template (B201) starts blank.
    const [choice, setChoice] = useState<TemplateChoice>(
        isOfferedTemplate(templateParam) ? templateParam : null,
    );
    // The name that was suggested last: a name the visitor typed is never replaced.
    const [suggested, setSuggested] = useState(
        () => startValues(choice, locale, blankName).name,
    );
    const [values, setValues] = useState<EditionFieldValues>(() => ({
        ...startValues(choice, locale, blankName),
        language: locale,
        currency: defaultCurrency(locale),
        boardProfile: DEFAULT_BOARD_PROFILE,
    }));
    // A currency the visitor picked stays when the language changes; otherwise it follows the language (B154).
    const [currencyPicked, setCurrencyPicked] = useState(false);
    // The currency picked for the previous new edition, until the visitor picks another (R5-22, B227).
    const [remembered, setRemembered] = useState(false);
    useEffect(() => {
        // After hydration: the server cannot know what this browser picked last.
        const last = readLastCurrency();
        if (last !== null) {
            setValues((now) => ({ ...now, currency: last }));
            setCurrencyPicked(true);
            setRemembered(true);
        }
    }, []);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);

    const submit = (event: FormEvent): void => {
        event.preventDefault();
        if (values.name.trim() === '' || busy) {
            return;
        }
        setBusy(true);
        if (currencyPicked) {
            rememberCurrency(values.currency);
        }
        const base =
            choice === null
                ? undefined
                : templateEdition(choice, values.language);
        (base === undefined
            ? repository.create({ ...values, name: values.name.trim() })
            : repository.createFrom({
                  ...base,
                  name: values.name.trim(),
                  currency: values.currency,
                  theme: values.theme,
                  boardProfile: values.boardProfile,
              })
        )
            .then((edition) => {
                router.visit(editorShow({ locale, edition: edition.id }));
            })
            .catch(() => {
                setFailed(true);
                setBusy(false);
            });
    };

    const pick = (next: TemplateChoice): void => {
        const start = startValues(next, values.language, blankName);
        setChoice(next);
        setSuggested(start.name);
        setValues({
            ...values,
            ...start,
            name: values.name === suggested ? start.name : values.name,
        });
    };

    const changeLanguage = (language: Locale): void => {
        const start = startValues(choice, language, blankName);
        setSuggested(start.name);
        setValues({
            ...values,
            language,
            name: values.name === suggested ? start.name : values.name,
            currency: currencyPicked
                ? values.currency
                : defaultCurrency(language),
        });
    };

    const m = messages[locale];
    const [open, setOpen] = useState<'theme' | 'currency' | null>(null);
    const shownName = useDeferredValue(values.name);
    const startLabel =
        choice === null
            ? t('templates.blank')
            : (template(choice, locale)?.label ?? t('templates.blank'));
    const toggle = (line: 'theme' | 'currency'): void =>
        setOpen(open === line ? null : line);

    return (
        <>
            <Head title={t('editions.new')} />
            <PageHero
                tone="board"
                art="edition"
                title={t('editions.new')}
                compact
            >
                <p className="m-0 max-w-[34em] text-lg">{t('edition.intro')}</p>
            </PageHero>
            <form
                onSubmit={submit}
                className="mx-auto grid max-w-content gap-8 px-4 pt-8 pb-44 md:px-8 md:pt-12 md:pb-32 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 lg:pb-12"
            >
                <div className="flex min-w-0 flex-col gap-8">
                    <TemplatePicker
                        value={choice}
                        onChange={pick}
                        locale={locale}
                        blankName={blankName}
                    />

                    <div className="flex flex-col gap-3">
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
                                value={values.language}
                                onValueChange={(next) => {
                                    // A click on the chosen language would clear the group; one is always chosen.
                                    const language = LANGUAGES.find(
                                        (id) => id === next,
                                    );
                                    if (language !== undefined) {
                                        changeLanguage(language);
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
                                currency={values.currency}
                                interfaceLanguage={locale}
                                idPrefix="new"
                                onTheme={(theme) =>
                                    setValues({ ...values, theme })
                                }
                            />
                        </ChoiceLine>
                        <ChoiceLine
                            title={t('edition.currency_line')}
                            summary={
                                remembered
                                    ? t('edition.currency_remembered', {
                                          currency: t(
                                              `edition.currency_${values.currency}`,
                                          ),
                                      })
                                    : t(`edition.currency_${values.currency}`)
                            }
                            open={open === 'currency'}
                            onToggle={() => toggle('currency')}
                            changeLabel={t('edition.change')}
                            collapseLabel={t('edition.collapse')}
                        >
                            <CurrencyChoice
                                currency={values.currency}
                                language={values.language}
                                idPrefix="new"
                                onCurrency={(currency) => {
                                    setCurrencyPicked(true);
                                    setRemembered(false);
                                    setValues({ ...values, currency });
                                }}
                            />
                        </ChoiceLine>
                    </div>
                </div>

                <NewEditionCard
                    locale={locale}
                    template={choice}
                    startLabel={startLabel}
                    name={values.name}
                    shownName={shownName}
                    onName={(name) => setValues({ ...values, name })}
                    language={values.language}
                    currency={values.currency}
                    theme={values.theme}
                    themeLabel={m.themeName[values.theme]}
                    profile={values.boardProfile}
                    busy={busy}
                    disabled={values.name.trim() === ''}
                    failed={failed}
                />
            </form>
        </>
    );
}
