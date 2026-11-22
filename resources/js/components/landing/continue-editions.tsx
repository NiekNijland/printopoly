import { Link, usePage } from '@inertiajs/react';
import { useSyncExternalStore } from 'react';

import { useEditionList } from '@/hooks/use-editions';
import { useTranslation } from '@/hooks/use-translation';
import { index as editionsIndex } from '@/routes/editions';
import { show as editorShow } from '@/routes/editor';

/** The editions edited last, so the one you came back for is rarely missing (R5-23: two was too few). */
const SHOWN = 4;

const subscribeNothing = () => () => undefined;

function Recent() {
    const t = useTranslation();
    const { locale } = usePage().props;
    const { editions } = useEditionList();

    if (editions === null || editions.length === 0) {
        return null;
    }

    const recent = editions.slice(0, SHOWN);

    return (
        <section
            aria-label={t('home.continue.title')}
            className="mx-auto max-w-content px-4 pt-6 md:px-8"
        >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-control border-2 border-ink bg-card px-4 py-3">
                {/* A label, not a heading: the page starts with its h1 (UX 8, ronde 3). */}
                <p className="m-0 text-base font-extrabold">
                    {t('home.continue.title')}
                </p>
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                    {recent.map((edition) => (
                        <li key={edition.id}>
                            <Link
                                href={editorShow({
                                    locale,
                                    edition: edition.id,
                                })}
                                className="inline-flex min-h-11 items-center rounded-control bg-print-chance px-3 font-semibold no-underline hover:underline"
                            >
                                {edition.name}
                            </Link>
                        </li>
                    ))}
                </ul>
                <Link
                    href={editionsIndex(locale).url}
                    className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:text-press md:ml-auto"
                >
                    {editions.length > SHOWN
                        ? t('home.continue.all_count', {
                              count: editions.length,
                          })
                        : t('home.continue.all')}
                </Link>
            </div>
        </section>
    );
}

/** "Verder met ..." for returning visitors: client-only, so the server renders nothing and the browser fills it in after hydration. */
export function ContinueEditions() {
    // False on the server and during hydration, true afterwards in the browser.
    const mounted = useSyncExternalStore(
        subscribeNothing,
        () => true,
        () => false,
    );

    return mounted ? <Recent /> : null;
}
