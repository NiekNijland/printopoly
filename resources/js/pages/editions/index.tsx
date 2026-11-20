import { Head, Link, usePage } from '@inertiajs/react';

import { EditionCard } from '@/components/editions/edition-card';
import { SyncDialog } from '@/components/editions/sync-dialog';
import { Button } from '@/components/ui/button';
import { useAccountSync } from '@/hooks/use-account-sync';
import { useEditionList } from '@/hooks/use-editions';
import { useTranslation } from '@/hooks/use-translation';
import { redirect as googleRedirect } from '@/routes/auth/google';
import { create as editionsCreate } from '@/routes/editions';

/** Mijn edities (B79, B96): the editions in this browser, with a banner to log in (B92). */
export default function EditionsIndex() {
    const t = useTranslation();
    const { locale, auth } = usePage().props;
    const { editions, refresh, error } = useEditionList();
    const sync = useAccountSync(refresh);
    const showBanner =
        auth.user === null &&
        auth.googleLoginEnabled &&
        editions !== null &&
        editions.length > 0;

    return (
        <>
            <Head title={t('nav.my_editions')} />
            <section className="mx-auto flex max-w-content flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="m-0 font-display text-3xl font-extrabold">
                        {t('nav.my_editions')}
                    </h1>
                    <Button asChild>
                        <Link href={editionsCreate(locale)}>
                            {t('editions.new')}
                        </Link>
                    </Button>
                </div>

                <SyncDialog sync={sync} />

                {showBanner && (
                    <div className="flex flex-wrap items-center gap-4 rounded-control border-2 border-ink bg-card p-4">
                        <p className="m-0 min-w-64 flex-1">
                            {t('editions.banner', { count: editions.length })}
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
                    <div className="flex flex-col items-center gap-4 rounded-control border-2 border-dashed border-line-strong px-4 py-16 text-center">
                        <p className="m-0 font-display text-2xl font-extrabold">
                            {t('editions.empty')}
                        </p>
                        <Button asChild>
                            <Link href={editionsCreate(locale)}>
                                {t('editions.new')}
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
                        {editions.map((edition) => (
                            <EditionCard
                                key={edition.id}
                                edition={edition}
                                onChanged={refresh}
                            />
                        ))}
                    </ul>
                )}
            </section>
        </>
    );
}
