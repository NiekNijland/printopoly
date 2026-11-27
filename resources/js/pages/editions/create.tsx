import { Head, router, usePage } from '@inertiajs/react';
import {
    useDeferredValue,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
    type FormEvent,
} from 'react';

import { PageHero } from '@/components/render/table-page-hero';
import type { EditionFieldValues } from '@/features/edition/editions/edition-choices';
import { NewEditionCard } from '@/features/edition/editions/new-edition-card';
import {
    LanguageLine,
    ThemeAndCurrency,
} from '@/features/edition/editions/new-edition-lines';
import {
    EMPTY_START,
    TemplatePicker,
    type TemplateChoice,
} from '@/features/edition/editions/template-picker';
import {
    readLastCurrency,
    rememberCurrency,
} from '@/features/edition/last-currency';
import { useServices } from '@/features/edition/use-editions';
import { useTranslation } from '@/hooks/use-translation';
import { messages } from '@/lib/render/edition-strings';
import { isOfferedTemplate } from '@/lib/render/edition-template-ids';
import { template, templateEdition } from '@/lib/render/edition-templates';
import { DEFAULT_PARTS } from '@/lib/render/edition-types';
import { emptiedEdition } from '@/lib/render/editor-clear-names';
import { defaultCurrency } from '@/lib/render/game-currency';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { show as editorShow } from '@/routes/editor';
import type { CurrencyId, Locale } from '@/types/game';

/**
 * The values a starting point fills in: name and theme. `null` is the blank edition. The parts are no choice here
 * (B198): every new edition starts with the same set, board and cards (B225), and the print page changes it.
 */
const startValues = (
    choice: TemplateChoice,
    language: Locale,
    blankName: string,
): Pick<EditionFieldValues, 'name' | 'theme' | 'parts'> => {
    const data =
        choice === null || choice === EMPTY_START
            ? undefined
            : template(choice, language);

    return {
        name: data?.name ?? blankName,
        theme: data?.theme ?? 'classic',
        parts: { ...DEFAULT_PARTS },
    };
};

const subscribeNothing = () => () => undefined;

const usePickerSeen = (seenAtStart: boolean) => {
    // On a phone and a tablet the button sits in a bar at the bottom of the screen. It comes in once the starting
    // points were in sight, so nobody makes a blank edition before seeing the templates (R5-21, B226).
    const picker = useRef<HTMLDivElement>(null);
    const [pickerSeen, setPickerSeen] = useState(seenAtStart);
    useEffect(() => {
        const node = picker.current;
        if (pickerSeen || node === null) {
            return;
        }
        // Every browser the site supports has an IntersectionObserver; without one the bar is there from the start.
        if (typeof IntersectionObserver === 'undefined') {
            return;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setPickerSeen(true);
                }
            },
            // Seen means the title and the first row of cards, not one pixel of it.
            { rootMargin: '0px 0px -160px 0px' },
        );
        observer.observe(node);

        return () => observer.disconnect();
    }, [pickerSeen]);

    return { picker, pickerSeen, setPickerSeen };
};

const createEdition = (
    repository: ReturnType<typeof useServices>['repository'],
    choice: TemplateChoice,
    values: EditionFieldValues & { currency: CurrencyId },
) => {
    const { currency } = values;
    const base =
        choice === null || choice === EMPTY_START
            ? undefined
            : templateEdition(choice, values.language);
    return base === undefined
        ? repository.create(
              {
                  ...values,
                  currency,
                  name: values.name.trim(),
              },
              // Leeg: the standard edition with empty names and cards, to fill in yourself (B259).
              choice === EMPTY_START ? emptiedEdition : undefined,
          )
        : repository.createFrom({
              ...base,
              name: values.name.trim(),
              currency,
              theme: values.theme,
              boardProfile: values.boardProfile,
          });
};

const useNewEdition = (templateParam: string | null) => {
    const t = useTranslation();
    const { locale } = usePage().props;
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
    // A currency the visitor picks stays when the language changes; otherwise it follows the language (B154). The
    // one picked for the previous new edition counts as picked (R5-22, B227). The server cannot know it, so it is
    // read after hydration.
    const [picked, setPicked] = useState<CurrencyId | null>(null);
    const last = useSyncExternalStore(
        subscribeNothing,
        readLastCurrency,
        () => null,
    );
    const currency = picked ?? last ?? defaultCurrency(values.language);
    const remembered = picked === null && last !== null;
    const { picker, pickerSeen, setPickerSeen } = usePickerSeen(
        choice !== null,
    );

    const pick = (next: TemplateChoice): void => {
        const start = startValues(next, values.language, blankName);
        setChoice(next);
        setPickerSeen(true);
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
        });
    };

    return {
        blankName,
        choice,
        values,
        setValues,
        picked,
        setPicked,
        last,
        currency,
        remembered,
        picker,
        pickerSeen,
        pick,
        changeLanguage,
    };
};

const useCreateSubmit = (edition: ReturnType<typeof useNewEdition>) => {
    const { locale } = usePage().props;
    const { repository } = useServices();
    const { choice, values, currency } = edition;
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
    const submit = (event: FormEvent): void => {
        event.preventDefault();
        if (values.name.trim() === '' || busy) {
            return;
        }
        setBusy(true);
        if (edition.picked !== null || edition.last !== null) {
            rememberCurrency(currency);
        }
        createEdition(repository, choice, { ...values, currency })
            .then((created) => {
                router.visit(editorShow({ locale, edition: created.id }));
            })
            .catch(() => {
                setFailed(true);
                setBusy(false);
            });
    };

    return { busy, failed, submit };
};

const startLabelOf = (
    choice: TemplateChoice,
    locale: Locale,
    t: ReturnType<typeof useTranslation>,
): string =>
    choice === null
        ? t('templates.blank')
        : choice === EMPTY_START
          ? t('templates.empty')
          : (template(choice, locale)?.label ?? t('templates.blank'));

/**
 * The new edition screen (B72, B127, B150, B198, B201): pick a starting point, check the language, theme and
 * currency, and give it a name next to the button. The theme and the currency come with the starting point and the
 * language, and stay folded until you change them.
 */
const EditionsCreate = ({
    template: templateParam = null,
}: {
    template?: string | null;
}) => {
    const t = useTranslation();
    const { locale } = usePage().props;
    const edition = useNewEdition(templateParam);
    const { blankName, choice, values, currency, picker } = edition;
    const { busy, failed, submit } = useCreateSubmit(edition);

    const m = messages[locale];
    const shownName = useDeferredValue(values.name);

    return (
        <>
            <Head title={t('editions.new')} />
            <PageHero
                tone="board"
                art="edition"
                title={t('editions.new')}
                compact
                artFromTablet
            >
                <p className="m-0 max-w-[34em] text-lg">{t('edition.intro')}</p>
            </PageHero>
            <form
                onSubmit={submit}
                className="mx-auto grid max-w-content gap-8 px-4 pt-8 pb-44 md:px-8 md:pt-12 md:pb-32 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 lg:pb-12"
            >
                <div className="flex min-w-0 flex-col gap-8">
                    <div ref={picker} className="min-w-0">
                        <TemplatePicker
                            value={choice}
                            onChange={edition.pick}
                            locale={locale}
                            blankName={blankName}
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <LanguageLine
                            language={values.language}
                            onLanguage={edition.changeLanguage}
                        />
                        <ThemeAndCurrency
                            values={values}
                            currency={currency}
                            remembered={edition.remembered}
                            shownName={shownName}
                            onTheme={(theme) =>
                                edition.setValues({ ...values, theme })
                            }
                            onCurrency={edition.setPicked}
                        />
                    </div>
                </div>

                <NewEditionCard
                    locale={locale}
                    template={choice === EMPTY_START ? null : choice}
                    empty={choice === EMPTY_START}
                    startLabel={startLabelOf(choice, locale, t)}
                    name={values.name}
                    shownName={shownName}
                    onName={(name) => edition.setValues({ ...values, name })}
                    language={values.language}
                    currency={currency}
                    theme={values.theme}
                    themeLabel={m.themeName[values.theme]}
                    profile={values.boardProfile}
                    busy={busy}
                    disabled={values.name.trim() === ''}
                    failed={failed}
                    barShown={edition.pickerSeen}
                />
            </form>
        </>
    );
};
export default EditionsCreate;
