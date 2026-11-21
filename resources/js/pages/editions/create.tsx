import { Head, router, usePage } from '@inertiajs/react';
import {
    useDeferredValue,
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from 'react';

import { ChoiceLine } from '@/components/editions/choice-line';
import {
    BoardChoice,
    PartsChoice,
    ThemeChoice,
    type EditionFieldValues,
} from '@/components/editions/edition-choices';
import { NewEditionCard } from '@/components/editions/new-edition-card';
import {
    TemplatePicker,
    type TemplateChoice,
} from '@/components/editions/template-picker';
import { PageHero } from '@/components/table/page-hero';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { isTemplateId, template, templateEdition } from '@/data/templates';
import { useServices } from '@/hooks/use-editions';
import { useTranslation } from '@/hooks/use-translation';
import { defaultCurrency } from '@/lib/edition/changes';
import { messages } from '@/lib/edition/strings';
import { PART_IDS } from '@/lib/edition/types';
import { DEFAULT_PARTS } from '@/lib/edition/types';
import type { Locale } from '@/lib/game/types';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import { show as editorShow } from '@/routes/editor';

/** The values a starting point fills in: name, theme and parts. `null` is the blank edition. */
function startValues(
    choice: TemplateChoice,
    language: Locale,
    blankName: string,
): Pick<EditionFieldValues, 'name' | 'theme' | 'parts'> {
    const data = choice === null ? undefined : template(choice, language);

    return {
        name: data?.name ?? blankName,
        theme: data?.theme ?? 'classic',
        parts: { ...DEFAULT_PARTS, ...data?.parts, board: true },
    };
}

/** Parts shown by name in the folded line before it says "and 3 more". */
const SHOWN_PARTS = 4;

/**
 * The new edition screen (B72, B99, B127, B150): pick a starting point, give it a name and a language, and the
 * editor opens. The theme and the parts come with the starting point and stay folded until you change them.
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
    const [choice, setChoice] = useState<TemplateChoice>(
        isTemplateId(templateParam) ? templateParam : null,
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
    const nameInput = useRef<HTMLInputElement>(null);
    useEffect(() => {
        // The suggested name is selected, ready to retype.
        nameInput.current?.focus({ preventScroll: true });
        nameInput.current?.select();
    }, []);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);

    const submit = (event: FormEvent): void => {
        event.preventDefault();
        if (values.name.trim() === '' || busy) {
            return;
        }
        setBusy(true);
        const base =
            choice === null
                ? undefined
                : templateEdition(choice, values.language);
        (base === undefined
            ? repository.create(values)
            : repository.createFrom({
                  ...base,
                  name: values.name.trim(),
                  currency: values.currency,
                  theme: values.theme,
                  parts: values.parts,
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
            // The currency follows the language; the editor changes it (B150).
            currency: defaultCurrency(language),
        });
    };

    const m = messages[locale];
    const [open, setOpen] = useState<'theme' | 'parts' | null>(null);
    const shownName = useDeferredValue(values.name);
    const chosenParts = PART_IDS.filter((id) => values.parts[id]);
    const partsSummary = [
        chosenParts
            .slice(0, SHOWN_PARTS)
            .map((id) => m.partName[id].toLowerCase())
            .join(', '),
        chosenParts.length > SHOWN_PARTS
            ? t('edition.parts_more', {
                  count: chosenParts.length - SHOWN_PARTS,
              })
            : '',
        values.boardProfile.id === 'custom' ? t('edition.own_size') : '',
    ]
        .filter((piece) => piece !== '')
        .join(', ');
    const startLabel =
        choice === null
            ? t('templates.blank')
            : (template(choice, locale)?.label ?? t('templates.blank'));
    const toggle = (line: 'theme' | 'parts'): void =>
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
                className="mx-auto grid max-w-content gap-8 px-4 pt-8 pb-32 md:px-8 md:pt-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12 lg:pb-12"
            >
                <div className="flex min-w-0 flex-col gap-8">
                    <TemplatePicker
                        value={choice}
                        onChange={pick}
                        locale={locale}
                        blankName={blankName}
                        hint="templates.hint_new"
                        compact
                    />

                    <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                        <label className="flex flex-col gap-1 text-sm font-semibold">
                            {t('edition.name')}
                            <Input
                                ref={nameInput}
                                value={values.name}
                                onChange={(event) =>
                                    setValues({
                                        ...values,
                                        name: event.target.value,
                                    })
                                }
                                autoComplete="off"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-sm font-semibold">
                            {t('edition.language')}
                            <Select
                                value={values.language}
                                onChange={(event) =>
                                    changeLanguage(
                                        event.target.value === 'en'
                                            ? 'en'
                                            : 'nl',
                                    )
                                }
                            >
                                <option value="nl">{m.languageName.nl}</option>
                                <option value="en" lang="en">
                                    {m.languageName.en}
                                </option>
                            </Select>
                        </label>
                        <p className="m-0 text-sm text-ink-soft sm:col-span-2">
                            {t('edition.currency_note', {
                                currency: t(
                                    `edition_panel.currency_${values.currency}`,
                                ),
                            })}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
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
                            title={t('edition.parts_line')}
                            summary={partsSummary}
                            open={open === 'parts'}
                            onToggle={() => toggle('parts')}
                            changeLabel={t('edition.change')}
                            collapseLabel={t('edition.collapse')}
                        >
                            <PartsChoice
                                parts={values.parts}
                                interfaceLanguage={locale}
                                onPart={(part, on) =>
                                    setValues({
                                        ...values,
                                        parts: { ...values.parts, [part]: on },
                                    })
                                }
                            />
                            <h3 className="m-0 mt-2 font-display text-base font-extrabold">
                                {t('edition.board')}
                            </h3>
                            <BoardChoice
                                profile={values.boardProfile}
                                interfaceLanguage={locale}
                                idPrefix="new"
                                onProfile={(boardProfile) =>
                                    setValues({ ...values, boardProfile })
                                }
                            />
                        </ChoiceLine>
                    </div>
                </div>

                <NewEditionCard
                    locale={locale}
                    template={choice}
                    startLabel={startLabel}
                    name={shownName}
                    language={values.language}
                    currency={values.currency}
                    theme={values.theme}
                    themeLabel={m.themeName[values.theme]}
                    partCount={chosenParts.length}
                    profile={values.boardProfile}
                    busy={busy}
                    disabled={values.name.trim() === ''}
                    failed={failed}
                />
            </form>
        </>
    );
}
