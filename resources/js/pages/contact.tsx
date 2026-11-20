import { Link, usePage } from '@inertiajs/react';

import { Seo } from '@/components/seo';
import { PageHero } from '@/components/table/page-hero';
import { useTranslation } from '@/hooks/use-translation';

interface ContactProps {
    contactEmail: string;
}

/** Contact, with the address for reports of anything that is not allowed (B67). */
export default function Contact({ contactEmail }: ContactProps) {
    const { pageUrls } = usePage().props;
    const t = useTranslation();
    const isAddress = /^[^\s@[\]]+@[^\s@[\]]+$/.test(contactEmail);

    return (
        <>
            <Seo
                title={t('contact.title')}
                description={t('contact.description')}
            />

            <PageHero tone="chance" art="contact" title={t('contact.title')}>
                <p className="m-0 max-w-[34em] text-lg">{t('contact.intro')}</p>
            </PageHero>

            <div className="mx-auto grid max-w-content grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-6 px-4 py-8 md:px-8 md:py-16">
                <section className="flex flex-col gap-2 rounded-control border-2 border-ink bg-card p-6">
                    <h2 className="m-0 font-display text-xl font-extrabold">
                        {t('contact.email_label')}
                    </h2>
                    <p className="m-0 text-lg font-semibold break-all">
                        {isAddress ? (
                            <a
                                href={`mailto:${contactEmail}`}
                                className="underline underline-offset-4"
                            >
                                {contactEmail}
                            </a>
                        ) : (
                            contactEmail
                        )}
                    </p>
                </section>

                <section className="flex flex-col gap-3 rounded-control border-2 border-ink bg-print-chest p-6">
                    <h2 className="m-0 font-display text-xl font-extrabold">
                        {t('contact.abuse_title')}
                    </h2>
                    <p className="m-0">{t('contact.abuse_body')}</p>
                    <Link
                        href={pageUrls.terms}
                        className="font-semibold underline underline-offset-4"
                    >
                        {t('contact.abuse_link')}
                    </Link>
                </section>

                <section className="flex flex-col gap-3 rounded-control border-2 border-ink bg-board p-6">
                    <h2 className="m-0 font-display text-xl font-extrabold">
                        {t('contact.security_title')}
                    </h2>
                    <p className="m-0">{t('contact.security_body')}</p>
                </section>
            </div>
        </>
    );
}
