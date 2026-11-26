import { Link, usePage } from '@inertiajs/react';
import { useRef } from 'react';

import { LanguageSwitch } from '@/components/language-switch';
import { Logo, LogoMark } from '@/components/logo';
import { RegistrationStrip } from '@/components/registration-strip';
import { Button } from '@/components/ui/button';
import { FolderIcon, MenuIcon } from '@/components/ui/icons';
import { AccountControl } from '@/features/edition/account-control';
import { useDisclosure } from '@/hooks/use-disclosure';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import {
    create as editionsCreate,
    index as editionsIndex,
} from '@/routes/editions';

/** Each link has its own accent from the print colours (B110). */
const ACCENTS = {
    cyan: {
        pill: 'bg-print-chance',
        bar: 'bg-print-cyan',
        hover: 'hover:bg-print-chance',
        block: 'bg-print-cyan',
    },
    magenta: {
        pill: 'bg-print-chest',
        bar: 'bg-print-magenta',
        hover: 'hover:bg-print-chest',
        block: 'bg-print-magenta',
    },
} as const;

type Accent = keyof typeof ACCENTS;

type NavLink = {
    href: string;
    label: string;
    accent: Accent;
};

const pathOf = (href: string): string => {
    return new URL(href, 'http://localhost').pathname.replace(/\/$/, '');
};

/**
 * Pages with their own red primary button. The header button turns secondary
 * there, so a screen never has two primaries (Stijlgids, B112).
 */
const OWN_PRIMARY = new Set([
    'home',
    'editions/index',
    'editions/create',
    'editions/sample',
    'print/show',
]);

/**
 * The header of public pages and Mijn edities (B91, B110): a colour strip on
 * top, the logo, two links with an accent colour each, the call to action,
 * NL/EN and the account button. Below 768 px the links fold into a sheet
 * (Mobiel-landing.dc.html).
 */
export const AppHeader = () => {
    const { locale, pageUrls } = usePage().props;
    const { url, component } = usePage();
    const ctaVariant = OWN_PRIMARY.has(component) ? 'secondary' : 'primary';
    const t = useTranslation();
    const headerRef = useRef<HTMLElement>(null);
    const mobileMenu = useDisclosure(headerRef);
    const current = pathOf(url);

    const links: NavLink[] = [
        {
            href: editionsIndex(locale).url,
            label: t('nav.my_editions'),
            accent: 'cyan',
        },
        {
            href: pageUrls.printGuide,
            label: t('nav.print_guide'),
            accent: 'magenta',
        },
    ];

    const isActive = (link: NavLink): boolean => {
        const path = pathOf(link.href);

        return current === path;
    };

    return (
        <header ref={headerRef} className="relative bg-card">
            <RegistrationStrip />
            <div className="border-b-2 border-ink">
                <div className="mx-auto flex max-w-content items-center gap-x-3 px-4 py-2 sm:gap-x-6 md:px-8 md:py-3">
                    <Link
                        href={home(locale)}
                        className="flex min-h-12 flex-1 items-center no-underline lg:flex-none"
                    >
                        {/* On a phone the mark alone, so "Mijn edities" fits next to it with its name (R5-23). */}
                        <span className="inline-flex min-[440px]:hidden">
                            <LogoMark size={36} />
                            <span className="sr-only">Printopoly</span>
                        </span>
                        <Logo
                            size="sm"
                            className="hidden min-[440px]:inline-flex md:hidden"
                        />
                        <Logo className="hidden md:inline-flex" />
                    </Link>

                    <nav
                        aria-label={t('nav.main')}
                        className="hidden flex-auto items-center gap-2 lg:flex"
                    >
                        {links.map((link) => {
                            const active = isActive(link);
                            const accent = ACCENTS[link.accent];

                            return (
                                <Link
                                    key={link.label}
                                    href={link.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'relative inline-flex min-h-11 items-center rounded-control px-4 font-semibold no-underline transition-colors',
                                        accent.hover,
                                        active && accent.pill,
                                    )}
                                >
                                    {link.label}
                                    {active && (
                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                'absolute inset-x-4 bottom-1 h-1 rounded-full',
                                                accent.bar,
                                            )}
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="hidden items-center gap-4 lg:flex">
                        <Button asChild size="compact" variant={ctaVariant}>
                            <Link href={editionsCreate(locale)}>
                                {t('nav.create_edition')}
                            </Link>
                        </Button>
                        <LanguageSwitch />
                        <AccountControl />
                    </div>

                    {/* A folder alone was a guess (vindbaarheid 1.1, R5-23): it says what it is, on a phone too. */}
                    <Button
                        asChild
                        variant="icon"
                        className="w-auto gap-2 bg-print-chance px-3 sm:px-4 lg:hidden"
                    >
                        <Link
                            href={editionsIndex(locale).url}
                            aria-current={
                                current === pathOf(editionsIndex(locale).url)
                                    ? 'page'
                                    : undefined
                            }
                        >
                            <FolderIcon />
                            <span className="font-semibold whitespace-nowrap">
                                {t('nav.my_editions')}
                            </span>
                        </Link>
                    </Button>

                    <Button
                        variant="icon"
                        className="lg:hidden"
                        aria-label={t('nav.menu')}
                        aria-expanded={mobileMenu.open}
                        aria-controls="mobile-menu"
                        onClick={mobileMenu.toggle}
                    >
                        <MenuIcon />
                    </Button>
                </div>
            </div>

            {mobileMenu.open && (
                <div
                    id="mobile-menu"
                    className="absolute inset-x-0 top-full z-30 flex flex-col gap-4 border-b-2 border-ink bg-card px-4 pt-2 pb-6 lg:hidden"
                >
                    <nav aria-label={t('nav.main')} className="flex flex-col">
                        {links.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                aria-current={
                                    isActive(link) ? 'page' : undefined
                                }
                                onClick={mobileMenu.close}
                                className={cn(
                                    '-mx-2 flex min-h-14 items-center gap-3 border-b border-line px-2 text-lg font-semibold no-underline',
                                    isActive(link) && ACCENTS[link.accent].pill,
                                )}
                            >
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        'h-6 w-2 rounded-full',
                                        ACCENTS[link.accent].block,
                                    )}
                                />
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                    <Button asChild variant={ctaVariant}>
                        <Link
                            href={editionsCreate(locale)}
                            onClick={mobileMenu.close}
                        >
                            {t('nav.create_edition')}
                        </Link>
                    </Button>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <LanguageSwitch />
                        <AccountControl />
                    </div>
                </div>
            )}
        </header>
    );
};
