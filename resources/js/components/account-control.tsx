import { Link, usePage } from '@inertiajs/react';
import { useRef } from 'react';

import { ChevronDownIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useDisclosure } from '@/hooks/use-disclosure';
import { useTranslation } from '@/hooks/use-translation';
import { logout } from '@/routes';
import { redirect as googleRedirect } from '@/routes/auth/google';

/**
 * "Inloggen met Google" for guests, the account menu for a logged-in user
 * (B90, B91). Logging in is optional, so without Google credentials the
 * button is not shown at all (B78).
 */
export function AccountControl() {
    const { auth } = usePage().props;
    const t = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const menu = useDisclosure(containerRef);

    if (auth.user === null) {
        if (!auth.googleLoginEnabled) {
            return null;
        }

        // A full page load: the redirect leaves the app for Google.
        return (
            <Button asChild variant="secondary" size="compact">
                <a href={googleRedirect().url}>{t('auth.login_with_google')}</a>
            </Button>
        );
    }

    const { name } = auth.user;

    return (
        <div ref={containerRef} className="relative">
            <Button
                variant="secondary"
                size="compact"
                className="px-3"
                aria-label={t('auth.account_of', { name })}
                aria-expanded={menu.open}
                aria-haspopup="true"
                onClick={menu.toggle}
            >
                <span
                    aria-hidden="true"
                    className="inline-flex size-7 items-center justify-center rounded-full border border-ink bg-board text-sm"
                >
                    {name.charAt(0).toUpperCase()}
                </span>
                {name}
                <ChevronDownIcon size={16} />
            </Button>
            {menu.open && (
                <div className="absolute right-0 z-20 mt-2 flex min-w-56 flex-col rounded-control border-2 border-ink bg-card px-4 py-1">
                    <Link
                        href={logout()}
                        as="button"
                        className="flex min-h-12 cursor-pointer items-center text-left hover:text-press"
                        onClick={menu.close}
                    >
                        {t('auth.logout')}
                    </Link>
                </div>
            )}
        </div>
    );
}
