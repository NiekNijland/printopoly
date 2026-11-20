import { Head, router, usePage } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';

import {
    EditionFields,
    type EditionFieldValues,
} from '@/components/editions/edition-fields';
import { PageHero } from '@/components/table/page-hero';
import { Button } from '@/components/ui/button';
import { useServices } from '@/hooks/use-editions';
import { useTranslation } from '@/hooks/use-translation';
import { defaultCurrency } from '@/lib/edition/changes';
import { DEFAULT_PARTS } from '@/lib/edition/types';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import { show as editorShow } from '@/routes/editor';

/** The new edition screen (B72, B99): one form, everything filled in, then the editor opens. */
export default function EditionsCreate() {
    const t = useTranslation();
    const { locale } = usePage().props;
    const { repository } = useServices();
    const [values, setValues] = useState<EditionFieldValues>({
        name: t('edition.default_name'),
        language: locale,
        currency: defaultCurrency(locale),
        theme: 'classic',
        parts: { ...DEFAULT_PARTS },
        boardProfile: DEFAULT_BOARD_PROFILE,
    });
    const [currencyChosen, setCurrencyChosen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);

    const submit = (event: FormEvent): void => {
        event.preventDefault();
        if (values.name.trim() === '' || busy) {
            return;
        }
        setBusy(true);
        repository
            .create(values)
            .then((edition) => {
                router.visit(editorShow({ locale, edition: edition.id }));
            })
            .catch(() => {
                setFailed(true);
                setBusy(false);
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
            <main className="mx-auto max-w-2xl px-4 py-8 md:px-8 md:py-12">
                <form onSubmit={submit} className="flex flex-col gap-8">
                    <EditionFields
                        autoFocusName
                        values={values}
                        interfaceLanguage={locale}
                        onName={(name) => setValues({ ...values, name })}
                        onLanguage={(language) =>
                            setValues({
                                ...values,
                                language,
                                // The currency follows the language until it was chosen by hand (B72).
                                currency: currencyChosen
                                    ? values.currency
                                    : defaultCurrency(language),
                            })
                        }
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
