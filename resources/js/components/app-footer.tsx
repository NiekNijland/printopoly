import { Link, usePage } from '@inertiajs/react';

import { Logo } from '@/components/logo';
import { RegistrationStrip } from '@/components/registration-strip';
import { useTranslation } from '@/hooks/use-translation';

/** The footer of public pages (B110): ink, with the process colours as accents. */
export function AppFooter() {
    const { pageUrls } = usePage().props;
    const t = useTranslation();

    const links = [
        {
            href: pageUrls.printGuide,
            label: t('nav.print_guide'),
            dot: 'bg-print-cyan',
        },
        {
            href: pageUrls.privacy,
            label: t('footer.privacy'),
            dot: 'bg-print-magenta',
        },
        {
            href: pageUrls.terms,
            label: t('footer.terms'),
            dot: 'bg-print-riso-yellow',
        },
        { href: pageUrls.contact, label: t('footer.contact'), dot: 'bg-press' },
    ];

    return (
        <footer className="bg-ink text-footer">
            <RegistrationStrip />
            <div className="mx-auto flex max-w-content flex-wrap items-center gap-x-8 gap-y-4 px-4 py-12 text-sm md:px-8">
                <Logo size="sm" tone="paper" />
                <nav
                    aria-label={t('nav.footer')}
                    className="flex flex-auto flex-wrap gap-x-6"
                >
                    {links.map((link) => (
                        <Link
                            key={link.label}
                            href={link.href}
                            className="inline-flex min-h-12 items-center gap-2 text-paper underline decoration-paper/40 underline-offset-4 hover:decoration-paper"
                        >
                            <span
                                aria-hidden="true"
                                className={`size-2.5 rounded-full ${link.dot}`}
                            />
                            {link.label}
                        </Link>
                    ))}
                </nav>
                <p className="m-0 flex basis-full flex-wrap items-center justify-between gap-x-6 gap-y-2">
                    <span>{t('footer.disclaimer')}</span>
                    <a
                        href="https://github.com/NiekNijland"
                        rel="me noopener"
                        className="inline-flex min-h-12 items-center text-paper underline decoration-paper/40 underline-offset-4 hover:decoration-paper"
                    >
                        {t('footer.made_by')}
                    </a>
                </p>
            </div>
        </footer>
    );
}
