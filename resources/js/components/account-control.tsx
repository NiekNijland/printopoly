import { Link, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';

import { ChevronDownIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useDisclosure } from '@/hooks/use-disclosure';
import { useTranslation } from '@/hooks/use-translation';
import {
    deleteAccount,
    logout as logoutRequest,
} from '@/lib/edition/remote/account';
import { classifySyncError, wipeLocalCopy } from '@/lib/editor/account';
import { getServices } from '@/lib/editor/services';
import { redirect as googleRedirect } from '@/routes/auth/google';

/**
 * "Inloggen met Google" for guests, the account menu for a logged-in user
 * (B90, B91). Logging in is optional, so without Google credentials the
 * button is not shown at all (B78).
 */
export function AccountControl() {
    const { auth } = usePage().props;
    const t = useTranslation();

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

    return <AccountMenu />;
}

/** The menu of a logged-in user (Staten "Accountmenu", B91): Privacy, Uitloggen, Account verwijderen. */
function AccountMenu() {
    const { auth, locale, pageUrls } = usePage().props;
    const t = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const menu = useDisclosure(containerRef);
    const [deleting, setDeleting] = useState(false);
    const [confirmation, setConfirmation] = useState('');
    const [problem, setProblem] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    if (auth.user === null) {
        return null;
    }
    const { name, email } = auth.user;

    // Both leave the page: the local copy is wiped first, so a shared computer keeps nothing (Staten).
    const leave = async (
        action: () => Promise<{ clearLocalCopy?: boolean; redirect: string }>,
    ): Promise<void> => {
        const result = await action();
        if (result.clearLocalCopy !== false) {
            await wipeLocalCopy(getServices(locale).repository);
        }
        window.location.assign(result.redirect);
    };

    const onLogout = (): void => {
        menu.close();
        setBusy(true);
        leave(() => logoutRequest()).catch(() => {
            setBusy(false);
            setProblem(t('auth.logout_failed'));
        });
    };

    const onDelete = (): void => {
        setBusy(true);
        setProblem(null);
        deleteAccount(confirmation)
            .then(async (outcome) => {
                if (!outcome.ok) {
                    setProblem(
                        outcome.message === ''
                            ? t('auth.delete_wrong_email')
                            : outcome.message,
                    );
                    setBusy(false);

                    return;
                }
                await leave(() =>
                    Promise.resolve({
                        clearLocalCopy: true,
                        redirect: outcome.result.redirect,
                    }),
                );
            })
            .catch((error: unknown) => {
                setBusy(false);
                setProblem(
                    classifySyncError(error) === 'rate-limit'
                        ? t('sync.problem_rate-limit')
                        : t('auth.delete_failed'),
                );
            });
    };

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
                <div className="absolute right-0 z-20 mt-2 flex min-w-64 flex-col rounded-control border-2 border-ink bg-card px-4 py-1">
                    <Link
                        href={pageUrls.privacy}
                        className="flex min-h-12 items-center no-underline hover:text-press"
                        onClick={menu.close}
                    >
                        {t('footer.privacy')}
                    </Link>
                    <button
                        type="button"
                        disabled={busy}
                        className="flex min-h-12 cursor-pointer items-center border-0 bg-transparent p-0 text-left text-base hover:text-press"
                        onClick={onLogout}
                    >
                        {t('auth.logout')}
                    </button>
                    <button
                        type="button"
                        className="flex min-h-12 cursor-pointer items-center border-0 bg-transparent p-0 text-left text-base hover:text-press"
                        onClick={() => {
                            menu.close();
                            setDeleting(true);
                        }}
                    >
                        {t('auth.delete_account')}
                    </button>
                    <p className="m-0 border-t border-line py-3 text-sm text-ink-soft">
                        {t('auth.logout_note')}
                    </p>
                    {problem !== null && (
                        <p role="alert" className="m-0 pb-3 text-sm text-press">
                            {problem}
                        </p>
                    )}
                </div>
            )}

            <Dialog open={deleting} onOpenChange={setDeleting}>
                <DialogContent>
                    <form
                        className="flex flex-col gap-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            onDelete();
                        }}
                    >
                        <DialogTitle>{t('auth.delete_title')}</DialogTitle>
                        <DialogDescription>
                            {t('auth.delete_body', { email })}
                        </DialogDescription>
                        <label className="flex flex-col gap-1 text-sm font-semibold">
                            {t('auth.delete_email_label')}
                            <Input
                                type="email"
                                value={confirmation}
                                autoComplete="off"
                                aria-invalid={problem !== null}
                                onChange={(event) =>
                                    setConfirmation(event.target.value)
                                }
                            />
                        </label>
                        {problem !== null && (
                            <p role="alert" className="m-0 text-sm text-press">
                                {problem}
                            </p>
                        )}
                        <div className="flex justify-end gap-3">
                            <DialogClose asChild>
                                <Button variant="secondary">
                                    {t('app.cancel')}
                                </Button>
                            </DialogClose>
                            <Button
                                type="submit"
                                disabled={busy || confirmation.trim() === ''}
                            >
                                {t('auth.delete_account')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
