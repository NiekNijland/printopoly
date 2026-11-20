import { Head, Link, usePage } from '@inertiajs/react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import { editor } from '@/routes';

/** Placeholder home page per locale until the landing page (B97) is built. */
export default function Home() {
    const { locale } = usePage().props;
    const t = useTranslation();

    return (
        <>
            <Head title={t('home.title')} />
            <section className="mx-auto flex max-w-content flex-col items-start gap-4 px-4 pt-8 pb-12 md:px-8 md:pt-16 md:pb-24">
                <h1 className="m-0 max-w-[18ch] font-display text-hero font-extrabold tracking-[-0.01em]">
                    {t('home.title')}
                </h1>
                <p className="m-0 max-w-[60ch] text-lg">{t('home.intro')}</p>
                <Button asChild className="w-full md:w-auto">
                    <Link href={editor(locale)}>{t('home.make_edition')}</Link>
                </Button>
            </section>
        </>
    );
}
