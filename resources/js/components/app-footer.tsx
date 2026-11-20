import { Link, usePage } from '@inertiajs/react';

import { Logo } from '@/components/logo';
import { useTranslation } from '@/hooks/use-translation';
import { contact, printGuide, privacy, terms } from '@/routes';

/** The footer of public pages, as in docs/design/Main.dc.html. */
export function AppFooter() {
    const { locale } = usePage().props;
    const t = useTranslation();

    const links = [
        { href: printGuide(locale), label: t('nav.print_guide') },
        { href: privacy(locale), label: t('footer.privacy') },
        { href: terms(locale), label: t('footer.terms') },
        { href: contact(locale), label: t('footer.contact') },
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
