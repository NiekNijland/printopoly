import { Link, usePage } from '@inertiajs/react';

import { Logo } from '@/components/logo';
import { useTranslation } from '@/hooks/use-translation';

/** The footer of public pages, as in docs/design/Main.dc.html. */
export function AppFooter() {
    const { pageUrls } = usePage().props;
    const t = useTranslation();

    const links = [
        { href: pageUrls.printGuide, label: t('nav.print_guide') },
        { href: pageUrls.privacy, label: t('footer.privacy') },
        { href: pageUrls.terms, label: t('footer.terms') },
        { href: pageUrls.contact, label: t('footer.contact') },
    ];

    return (
        <footer className="bg-ink text-footer">
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
                            className="inline-flex min-h-12 items-center text-paper underline"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>
                <p className="m-0 basis-full">{t('footer.disclaimer')}</p>
            </div>
        </footer>
    );
}
