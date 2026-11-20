import { Head, Link, usePage } from '@inertiajs/react';
import { useMemo } from 'react';

import { EditionCard } from '@/components/editions/edition-card';
import { EmptyState } from '@/components/editions/empty-state';
import { SyncDialog } from '@/components/editions/sync-dialog';
import { Button } from '@/components/ui/button';
import { useAccountSync } from '@/hooks/use-account-sync';
import { useEditionList } from '@/hooks/use-editions';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';
import { createRemoteEditionStore } from '@/lib/edition/remote/store';
import { createAccountActions } from '@/lib/editor/account-actions';
import { uploadAccountPhoto } from '@/lib/print/api';
import { redirect as googleRedirect } from '@/routes/auth/google';
import { create as editionsCreate } from '@/routes/editions';

/** Mijn edities (B79, B96): the editions in this browser, with a banner to log in (B92). */
export default function EditionsIndex() {
    const t = useTranslation();
    const tc = useTranslationChoice();
    const { locale, auth } = usePage().props;
    const { editions, refresh, error } = useEditionList();
    const sync = useAccountSync(refresh);
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
                        <h1 className="m-0 font-display text-3xl font-extrabold md:text-[40px]">
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

                {showBanner && (
                    <div className="flex flex-wrap items-center gap-4 rounded-control border-2 border-ink bg-card p-4">
                        <p className="m-0 min-w-64 flex-1">
                            {tc('editions.banner', editions.length)}
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
                    <ul className="m-0 grid list-none grid-cols-1 gap-8 p-0 sm:grid-cols-2 lg:grid-cols-3">
                        {editions.map((edition, index) => (
                            <EditionCard
                                key={edition.id}
                                edition={edition}
                                tilt={index}
                                onChanged={() => {
                                    refresh();
                                    sync.refreshAccount();
                                }}
                                account={account}
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
}
