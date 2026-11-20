import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

import { MenuIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useServices } from '@/hooks/use-editions';
import { useTranslation } from '@/hooks/use-translation';
import type { EditionSummary } from '@/lib/edition/types';
import type { AccountActions } from '@/lib/editor/account-actions';
import { cn } from '@/lib/utils';
import { show as editorShow } from '@/routes/editor';

import { EditionThumbnail } from './edition-thumbnail';

interface EditionCardProps {
    edition: EditionSummary;
    onChanged: () => void;
    /** Set when someone is logged in: renaming, copying and deleting then reach the account too. */
    account?: AccountActions | null;
    /** The account holds this edition. */
    inAccount?: boolean;
    /** Position in the list; every card lies a little differently on the table. */
    tilt?: number;
}

const TILT = [
    'md:-rotate-1',
    'md:rotate-[0.8deg]',
    'md:-rotate-[0.4deg]',
    'md:rotate-1',
] as const;

/** The colour band on top of a card follows the theme of the edition. */
const BAND: Record<EditionSummary['theme'], string> = {
    classic: 'bg-board-deep',
    riso: 'bg-print-chest',
    strak: 'bg-card',
};

function formatDate(at: number, locale: string): string {
    return new Intl.DateTimeFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', {
        day: 'numeric',
        month: 'short',
    }).format(at);
}

/** One edition in Mijn edities: board thumbnail, name, and the menu with Rename, Duplicate and Delete (B96). */
export function EditionCard({
    edition,
    onChanged,
    account = null,
    inAccount = false,
    tilt = 0,
}: EditionCardProps) {
    const t = useTranslation();
    const { locale } = usePage().props;
    const { repository } = useServices();
    const [renaming, setRenaming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [name, setName] = useState(edition.name);
    const [failed, setFailed] = useState(false);

    const run = async (action: () => Promise<unknown>): Promise<boolean> => {
        try {
            await action();
            setFailed(false);
            onChanged();

            return true;
        } catch {
            setFailed(true);

            return false;
        }
    };

    return (
        <li
            className={cn(
                'relative flex flex-col overflow-hidden rounded-control border-2 border-ink bg-card shadow-paper',
                'motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-1 motion-safe:hover:rotate-0',
                TILT[tilt % TILT.length],
            )}
        >
            <div
                aria-hidden="true"
                className={cn('h-3 border-b-2 border-ink', BAND[edition.theme])}
            />
            <Link
                href={editorShow({ locale, edition: edition.id })}
                aria-label={t('editions.open', { name: edition.name })}
                className="flex justify-center bg-table px-4 py-6 no-underline"
            >
                <EditionThumbnail
                    editionId={edition.id}
                    version={edition.updatedAt}
                    label={t('editions.thumbnail', { name: edition.name })}
                />
            </Link>
            <div className="flex items-start gap-2 p-4">
                <div className="min-w-0 flex-1">
                    <h2 className="m-0 truncate font-display text-xl font-extrabold">
                        {edition.name}
                    </h2>
                    <p className="m-0 text-sm text-ink-soft">
                        {t('editions.meta', {
                            count: edition.customizedElements,
                            date: formatDate(edition.updatedAt, locale),
                        })}
                    </p>
                    <p className="m-0 text-sm text-ink-soft">
                        {inAccount
                            ? t('editions.where_account')
                            : t('editions.where_browser')}
                    </p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="icon"
                            aria-label={t('editions.more', {
                                name: edition.name,
                            })}
                        >
                            <MenuIcon />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem
                            onSelect={() => {
                                setName(edition.name);
                                setRenaming(true);
                            }}
                        >
                            {t('editions.rename')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onSelect={() =>
                                void run(async () => {
                                    const copy = await repository.duplicate(
                                        edition.id,
                                    );
                                    await account?.copy(edition.id, copy);
                                })
                            }
                        >
                            {t('editions.duplicate')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="font-semibold text-press"
                            onSelect={() => setDeleting(true)}
                        >
                            {t('editions.delete')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {failed && (
                <p role="alert" className="m-0 px-4 pb-4 text-sm text-press">
                    {t('editions.action_failed')}
                </p>
            )}

            <Dialog open={renaming} onOpenChange={setRenaming}>
                <DialogContent>
                    <form
                        className="flex flex-col gap-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (name.trim() === '') {
                                return;
                            }
                            void run(async () => {
                                await repository.rename(edition.id, name);
                                await account?.rename(edition.id, name);
                            }).then((ok) => {
                                if (ok) {
                                    setRenaming(false);
                                }
                            });
                        }}
                    >
                        <DialogTitle>{t('editions.rename')}</DialogTitle>
                        <DialogDescription className="sr-only">
                            {t('editions.rename_description')}
                        </DialogDescription>
                        <label className="flex flex-col gap-1 text-sm font-semibold">
                            {t('edition.name')}
                            <Input
                                value={name}
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                            />
                        </label>
                        {failed && (
                            <p role="alert" className="m-0 text-sm text-press">
                                {t('editions.action_failed')}
                            </p>
                        )}
                        <div className="flex justify-end gap-3">
                            <DialogClose asChild>
                                <Button variant="secondary">
                                    {t('app.cancel')}
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={name.trim() === ''}>
                                {t('app.save')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={deleting} onOpenChange={setDeleting}>
                <DialogContent>
                    <DialogTitle>
                        {t('editions.delete_title', { name: edition.name })}
                    </DialogTitle>
                    <DialogDescription>
                        {inAccount
                            ? t('editions.delete_body_account')
                            : t('editions.delete_body')}
                    </DialogDescription>
                    {failed && (
                        <p
                            role="alert"
                            className="mt-4 mb-0 text-sm text-press"
                        >
                            {t('editions.action_failed')}
                        </p>
                    )}
                    <div className="mt-6 flex justify-end gap-3">
                        <DialogClose asChild>
                            <Button variant="secondary">
                                {t('app.cancel')}
                            </Button>
                        </DialogClose>
                        <Button
                            onClick={() =>
                                void run(async () => {
                                    // The account first: when that fails, nothing is gone and the edition does not return.
                                    await account?.remove(edition.id);
                                    await repository.delete(edition.id);
                                }).then((ok) => {
                                    if (ok) {
                                        setDeleting(false);
                                    }
                                })
                            }
                        >
                            {t('editions.delete')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </li>
    );
}
