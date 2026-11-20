import { Head, router, usePage } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';

import {
    EditionFields,
    type EditionFieldValues,
} from '@/components/editions/edition-fields';
import {
    TemplatePicker,
    type TemplateChoice,
} from '@/components/editions/template-picker';
import { PageHero } from '@/components/table/page-hero';
import { Button } from '@/components/ui/button';
import { isTemplateId, template, templateEdition } from '@/data/templates';
import { useServices } from '@/hooks/use-editions';
import { useTranslation } from '@/hooks/use-translation';
import { defaultCurrency } from '@/lib/edition/changes';
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

/**
 * The new edition screen (B72, B99, B127): pick a starting point, then one form with everything
 * filled in, and the editor opens.
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
    const [currencyChosen, setCurrencyChosen] = useState(false);
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
            // The currency follows the language until it was chosen by hand (B72).
            currency: currencyChosen
                ? values.currency
                : defaultCurrency(language),
        });
    };

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
            <main className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
                <form onSubmit={submit} className="flex flex-col gap-8">
                    <TemplatePicker
                        value={choice}
                        onChange={pick}
                        locale={locale}
                        blankName={blankName}
                    />
                    <div className="max-w-2xl">
                        <EditionFields
                            autoFocusName
                            values={values}
                            interfaceLanguage={locale}
                            onName={(name) => setValues({ ...values, name })}
                            onLanguage={changeLanguage}
                            onCurrency={(currency) => {
                                setCurrencyChosen(true);
                                setValues({ ...values, currency });
                            }}
                            onTheme={(theme) => setValues({ ...values, theme })}
                            onPart={(part, on) =>
                                setValues({
                                    ...values,
                                    parts: { ...values.parts, [part]: on },
                                })
                            }
                            onProfile={(boardProfile) =>
                                setValues({ ...values, boardProfile })
                            }
                        />
                    </div>

                    <div className="flex flex-col gap-3 border-t-2 border-ink pt-6">
                        <p className="m-0 text-sm text-ink-soft">
                            {t('edition.storage_note')}
                        </p>
                        {failed && (
                            <p role="alert" className="m-0 text-press">
                                {t('edition.create_failed')}
                            </p>
                        )}
                        <Button
                            type="submit"
                            disabled={busy || values.name.trim() === ''}
                            aria-busy={busy}
                            className="self-start"
                        >
                            {busy
                                ? t('edition.submitting')
                                : t('edition.submit')}
                        </Button>
                    </div>
                </form>
            </main>
        </>
    );
}
