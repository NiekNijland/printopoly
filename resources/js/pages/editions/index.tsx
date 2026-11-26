import { Head, Link, usePage } from '@inertiajs/react';
import { MonitorSmartphone } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    EditionCard,
    type EditionChange,
} from '@/features/edition/editions/edition-card';
import { EmptyState } from '@/features/edition/editions/empty-state';
import { SyncDialog } from '@/features/edition/editions/sync-dialog';
import { createAccountActions } from '@/features/edition/editor/account-actions';
import { getEnvironment } from '@/features/edition/editor/services';
import { createRemoteEditionStore } from '@/features/edition/remote/store';
import { useAccountSync } from '@/features/edition/use-account-sync';
import { useEditionStatus } from '@/features/edition/use-edition-status';
import { useEditionList, useServices } from '@/features/edition/use-editions';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';
import { reportError } from '@/lib/bugsnag';
import { uploadAccountPhoto } from '@/lib/render/print-api';
import { printedState, readPrinted } from '@/lib/render/print-printed';
import { redirect as googleRedirect } from '@/routes/auth/google';
import { create as editionsCreate } from '@/routes/editions';

/** Mijn edities (B79, B96): the editions in this browser, with a banner to log in (B92). */
const EditionsIndex = () => {
    const t = useTranslation();
    const tc = useTranslationChoice();
    const { locale, auth } = usePage().props;
    const { editions, refresh, error } = useEditionList();
    const sync = useAccountSync(refresh);
    const { storage } = useServices();
    const status = useEditionStatus(
        editions,
        auth.user !== null,
        sync.accountIds,
        storage,
    );
    const account = useMemo(
        () =>
            auth.user === null
                ? null
                : createAccountActions(
                      createRemoteEditionStore({
                          uploadPhoto: uploadAccountPhoto,
                      }),
                  ),
        [auth.user],
    );
    const [notice, setNotice] = useState('');
    const list = useRef<HTMLUListElement>(null);
    const heading = useRef<HTMLHeadingElement>(null);
    // After a delete the card is gone: focus goes to the card that took its place, else the heading.
    const focusAfter = useRef<number | null>(null);

    useEffect(() => {
        if (focusAfter.current === null || editions === null) {
            return;
        }
        const links = list.current?.querySelectorAll<HTMLElement>(
            '[data-edition-link]',
        );
        const target =
            links?.[Math.min(focusAfter.current, links.length - 1)] ??
            heading.current;
        focusAfter.current = null;
        target?.focus();
    }, [editions]);

    const changed = (index: number, change: EditionChange): void => {
        if (change.type === 'deleted') {
            focusAfter.current = index;
        }
        setNotice(
            change.type === 'deleted'
                ? t('editions.deleted')
                : t(`editions.${change.type}`, { name: change.name }),
        );
        refresh();
        sync.refreshAccount();
    };

    // Safari clears the storage of a site after 7 days without a visit, unless it keeps the site: the editor and
    // this page say so in the same words (R6 Sara, Kees).
    const [safariRisk, setSafariRisk] = useState(false);
    // Which editions this browser printed (R6 Kees); read once, the page is client-only.
    const [printedMarks] = useState(readPrinted);
    useEffect(() => {
        let current = true;
        void getEnvironment()
            .then((info) => {
                if (current) {
                    setSafariRisk(info.safariEvictionRisk);
                }
            })
            .catch(reportError);

        return () => {
            current = false;
        };
    }, []);

    const showBanner =
        auth.user === null &&
        auth.googleLoginEnabled &&
        editions !== null &&
        editions.length > 0;

    return (
        <>
            <Head title={t('nav.my_editions')} />
            <header className="border-b-2 border-ink bg-board">
                <div className="mx-auto flex max-w-content flex-wrap items-end justify-between gap-4 px-4 py-8 md:px-8 md:py-12">
                    <div className="flex flex-col gap-1">
                        <h1
                            ref={heading}
                            tabIndex={-1}
                            className="m-0 font-display text-3xl font-extrabold outline-none md:text-[40px]"
                        >
                            {t('nav.my_editions')}
                        </h1>
                        <p className="m-0 text-ink-soft">
                            {editions === null || editions.length === 0
                                ? t('editions.lead_empty')
                                : t(
                                      auth.user === null
                                          ? 'editions.lead'
                                          : 'editions.lead_account',
                                      {
                                          count: editions.length,
                                      },
                                  )}
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={editionsCreate(locale)}>
                            {t('editions.new')}
                        </Link>
                    </Button>
                </div>
            </header>
            <section className="mx-auto flex max-w-content flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
                <SyncDialog sync={sync} />

                <p
                    role="status"
                    className="m-0 text-sm font-semibold empty:hidden"
                >
                    {notice}
                </p>

                {showBanner && (
                    // A note, not an alarm (R5-23): a thin line and a device, the button stays the only control.
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-control border border-line-strong bg-card p-4">
                        <MonitorSmartphone
                            aria-hidden="true"
                            className="size-7 shrink-0 text-ink-soft"
                        />
                        <p className="m-0 min-w-56 flex-1 text-ink-soft">
                            {tc(
                                safariRisk
                                    ? 'editions.banner_safari'
                                    : 'editions.banner',
                                editions.length,
                            )}
                        </p>
                        <Button variant="secondary" asChild>
                            <a href={googleRedirect().url}>
                                {t('auth.login_with_google')}
                            </a>
                        </Button>
                    </div>
                )}

                {error && (
                    <p role="alert" className="m-0 text-press">
                        {t('editions.load_failed')}
                    </p>
                )}

                {editions === null ? (
                    <p className="m-0 text-ink-soft" role="status">
                        {t('editions.loading')}
                    </p>
                ) : editions.length === 0 ? (
                    <EmptyState locale={locale} />
                ) : (
                    <ul
                        ref={list}
                        className="m-0 grid list-none grid-cols-1 gap-8 p-0 sm:grid-cols-2 lg:grid-cols-3"
                    >
                        {editions.map((edition, index) => (
                            <EditionCard
                                key={edition.id}
                                edition={edition}
                                tilt={index}
                                onChanged={(change) => changed(index, change)}
                                account={account}
                                status={status[edition.id]}
                                printed={printedState(
                                    printedMarks,
                                    edition.id,
                                    edition.revision,
                                )}
                                inAccount={
                                    sync.accountIds?.has(edition.id) ?? false
                                }
                            />
                        ))}
                    </ul>
                )}
            </section>
        </>
    );
};
export default EditionsIndex;
