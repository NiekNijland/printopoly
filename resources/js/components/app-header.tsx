import { Link, usePage } from '@inertiajs/react';
import { useRef } from 'react';

import { AccountControl } from '@/components/account-control';
import { MenuIcon } from '@/components/icons';
import { LanguageSwitch } from '@/components/language-switch';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { useDisclosure } from '@/hooks/use-disclosure';
import { useTranslation } from '@/hooks/use-translation';
import { home, printGuide } from '@/routes';
import { index as editionsIndex } from '@/routes/editions';

/**
 * The header of public pages and Mijn edities (B91), as in
 * docs/design/Main.dc.html. Below 768 px the links fold into a menu
 * (Mobiel-landing.dc.html).
 */
export function AppHeader() {
    const { locale } = usePage().props;
    const t = useTranslation();
    const headerRef = useRef<HTMLElement>(null);
    const mobileMenu = useDisclosure(headerRef);

    const links = [
        { href: editionsIndex(locale), label: t('nav.my_editions') },
        { href: printGuide(locale), label: t('nav.print_guide') },
    ];

    return (
        <header ref={headerRef} className="border-b border-line">
            <div className="mx-auto flex max-w-content flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 md:px-8 md:py-4">
                <Link
                    href={home(locale)}
                    className="flex min-h-12 flex-1 items-center no-underline md:flex-none"
                >
                    <Logo size="sm" className="md:hidden" />
                    <Logo className="hidden md:inline-flex" />
                </Link>

                <nav
                    aria-label={t('nav.main')}
                    className="hidden flex-auto flex-wrap gap-x-6 md:flex"
                >
                    {links.map((link) => (
                        <Link
                            key={link.label}
                            href={link.href}
                            className="inline-flex min-h-12 items-center font-semibold no-underline hover:text-press"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="hidden items-center gap-4 md:flex">
                    <LanguageSwitch />
                    <AccountControl />
                </div>

                <Button
                    variant="icon"
                    className="md:hidden"
                    aria-label={t('nav.menu')}
                    aria-expanded={mobileMenu.open}
                    aria-controls="mobile-menu"
                    onClick={mobileMenu.toggle}
                >
                    <MenuIcon />
                </Button>
            </div>

            {mobileMenu.open && (
                <div
                    id="mobile-menu"
                    className="flex flex-col gap-2 border-t border-line px-4 pt-2 pb-4 md:hidden"
                >
                    <nav aria-label={t('nav.main')} className="flex flex-col">
                        {links.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                onClick={mobileMenu.close}
                                className="flex min-h-12 items-center border-b border-line font-semibold no-underline"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <LanguageSwitch />
                        <AccountControl />
                    </div>
                </div>
            )}
        </header>
    );
}
