import { Link, usePage } from '@inertiajs/react';

import { Seo } from '@/components/seo';
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

            <div className="mx-auto flex max-w-content flex-col gap-8 px-4 py-8 md:px-8 md:py-16">
                <header className="flex max-w-180 flex-col gap-4">
                    <h1 className="m-0 font-display text-[40px] leading-[1.05] font-extrabold">
                        {t('contact.title')}
                    </h1>
                    <p className="m-0 text-lg">{t('contact.intro')}</p>
                </header>

                <section className="flex max-w-180 flex-col gap-2 rounded-control border-2 border-ink bg-card p-6">
                    <h2 className="m-0 font-display text-xl font-extrabold">
                        {t('contact.email_label')}
                    </h2>
                    <p className="m-0 text-lg font-semibold break-all">
                        {isAddress ? (
                            <a href={`mailto:${contactEmail}`}>
                                {contactEmail}
                            </a>
                        ) : (
                            contactEmail
                        )}
                    </p>
                </section>

                <section className="flex max-w-180 flex-col gap-3">
                    <h2 className="m-0 font-display text-2xl font-extrabold">
                        {t('contact.abuse_title')}
                    </h2>
                    <p className="m-0">{t('contact.abuse_body')}</p>
                    <Link href={pageUrls.terms} className="font-semibold">
                        {t('contact.abuse_link')}
                    </Link>
                </section>

                <section className="flex max-w-180 flex-col gap-3">
                    <h2 className="m-0 font-display text-2xl font-extrabold">
                        {t('contact.security_title')}
                    </h2>
                    <p className="m-0">{t('contact.security_body')}</p>
                </section>
            </div>
        </>
    );
}
