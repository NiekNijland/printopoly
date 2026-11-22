import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

import { CopyIcon, MoreIcon } from '@/components/icons';
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
import { NO_STATUS, type EditionStatus } from '@/hooks/use-edition-status';
import { useServices } from '@/hooks/use-editions';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';
import { messages } from '@/lib/edition/strings';
import type { EditionSummary } from '@/lib/edition/types';
import type { AccountActions } from '@/lib/editor/account-actions';
import type { PrintedState } from '@/lib/print/printed';
import { cn } from '@/lib/utils';
import { print as editionPrint } from '@/routes/editions';
import { show as editorShow } from '@/routes/editor';

import { EditionThumbnail } from './edition-thumbnail';

export type EditionChange =
    | { type: 'renamed'; name: string }
    | { type: 'duplicated'; name: string }
    | { type: 'deleted' };

interface EditionCardProps {
    edition: EditionSummary;
    onChanged: (change: EditionChange) => void;
    /** Set when someone is logged in: renaming, copying and deleting then reach the account too. */
    account?: AccountActions | null;
    /** The account holds this edition. */
    inAccount?: boolean;
    /** What waits on this edition: contributions of friends and PDFs that are made (B95). */
    status?: EditionStatus;
    /** Position in the list; every card lies a little differently on the table. */
    tilt?: number;
    /** Whether this browser printed the edition, also after the files are gone (R6 Kees, B260). */
    printed?: PrintedState;
}

const TILT = [
    'md:-rotate-1',
    'md:rotate-[0.8deg]',
    'md:-rotate-[0.4deg]',
    'md:rotate-1',
] as const;

/** The theme chip on a card has the colour of the theme (bug 41: no loose band on top of the card). */
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
    status = NO_STATUS,
    tilt = 0,
    printed,
}: EditionCardProps) {
    const t = useTranslation();
    const tc = useTranslationChoice();
    const { locale } = usePage().props;
    const { repository } = useServices();
    const [renaming, setRenaming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [name, setName] = useState(edition.name);
    const [failed, setFailed] = useState(false);
    const [busy, setBusy] = useState(false);

    const run = async (
        action: () => Promise<EditionChange>,
    ): Promise<boolean> => {
        if (busy) {
            return false;
        }
        setBusy(true);
        try {
            const change = await action();
            setFailed(false);
            onChanged(change);

            return true;
        } catch {
            setFailed(true);

            return false;
        } finally {
            setBusy(false);
        }
    };

    /**
     * A copy for another couple or group: it opens in the editor with its name ready to retype (vindbaarheid 1.3,
     * point 6), instead of a second card that looks the same.
     */
    const duplicate = (): void => {
        let copyId: string | null = null;

        void run(async () => {
            const copy = await repository.duplicate(edition.id);
            await account?.copy(edition.id, copy);
            copyId = copy.id;

            return { type: 'duplicated', name: copy.name };
        }).then((ok) => {
            if (ok && copyId !== null) {
                router.visit(
                    editorShow(
                        { locale, edition: copyId },
                        {
                            query: {
                                edition: 'general',
                                field: 'edition.name',
                            },
                        },
                    ).url,
                );
            }
        });
    };

    const lines: {
        text: string;
        tone: 'new' | 'ready' | 'printed' | 'plain';
    }[] = [];
    if (status.contributions > 0) {
        lines.push({
            text: tc('editions.status_contributions', status.contributions),
            tone: 'new',
        });
    } else if (status.boxUntil !== null) {
        lines.push({
            text: t('editions.status_box_open', {
                date: formatDate(status.boxUntil, locale),
            }),
            tone: 'plain',
        });
    }
    for (const [set, state] of [
        ['printer', status.printer],
        ['home', status.home],
    ] as const) {
        if (state.readyUntil !== null) {
            lines.push({
                text: t(`editions.status_${set}_ready`, {
                    date: formatDate(state.readyUntil, locale),
                }),
                tone: 'ready',
            });
        } else if (state.outdated) {
            lines.push({
                text: t(`editions.status_${set}_outdated`),
                tone: 'plain',
            });
        }
    }
    // Printed or not, once the files of the 7 days are gone or were never made (R6 Kees).
    if (
        printed !== undefined &&
        status.printer.readyUntil === null &&
        status.home.readyUntil === null &&
        !status.printer.outdated &&
        !status.home.outdated
    ) {
        lines.push(
            printed.kind === 'never'
                ? { text: t('editions.status_not_printed'), tone: 'plain' }
                : {
                      text: t(
                          printed.kind === 'printed'
                              ? 'editions.status_printed'
                              : 'editions.status_printed_changed',
                          { date: formatDate(printed.at, locale) },
                      ),
                      tone: printed.kind === 'printed' ? 'printed' : 'plain',
                  },
        );
    }

    return (
        <li
            className={cn(
                'relative flex flex-col overflow-hidden rounded-control border-2 border-ink bg-card shadow-paper',
                'motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-1 motion-safe:hover:rotate-0',
                TILT[tilt % TILT.length],
            )}
        >
            <Link
                href={editorShow({ locale, edition: edition.id })}
                tabIndex={-1}
                className="flex justify-center bg-table px-4 py-6 no-underline"
            >
                <EditionThumbnail
                    editionId={edition.id}
                    version={edition.updatedAt}
                    label={t('editions.thumbnail', { name: edition.name })}
                />
            </Link>
            {/* The menu sits top right but comes last in the tab order, after Openen (ronde 3, designcheck ronde 4). */}
            <div className="relative flex flex-1 flex-col">
                <div className="flex items-start gap-2 p-4 pr-[4.25rem]">
                    <div className="min-w-0 flex-1">
                        <h2
                            className={cn(
                                'm-0 font-display font-extrabold break-words',
                                edition.name.length > 32
                                    ? 'text-lg'
                                    : 'text-xl',
                            )}
                        >
                            {edition.name}
                        </h2>
                        <p className="m-0 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
                            <span
                                className={cn(
                                    'inline-flex items-center rounded-full border border-ink px-2 text-xs leading-5 font-semibold text-ink',
                                    BAND[edition.theme],
                                )}
                            >
                                {messages[locale].themeName[edition.theme]}
                            </span>
                            {/* What you changed, never a score: "16 aangepast", nothing at 0 (UX 7, B178). */}
                            {edition.customizedElements > 0
                                ? t('editions.meta', {
                                      count: edition.customizedElements,
                                      date: formatDate(
                                          edition.updatedAt,
                                          locale,
                                      ),
                                  })
                                : t('editions.meta_edited', {
                                      date: formatDate(
                                          edition.updatedAt,
                                          locale,
                                      ),
                                  })}
                        </p>
                        <p className="m-0 text-sm text-ink-soft">
                            {inAccount
                                ? t('editions.where_account')
                                : t('editions.where_browser')}
                        </p>
                    </div>
                </div>
                {lines.length > 0 && (
                    // Status lines, not buttons: a mark and a line of text each, as on the print page (B98).
                    <ul
                        aria-label={t('editions.status_label')}
                        className="m-0 flex list-none flex-col gap-1 px-4 pb-3"
                    >
                        {lines.map((line) => (
                            <li
                                key={line.text}
                                className={cn(
                                    'flex items-baseline gap-2 text-sm',
                                    line.tone === 'new' &&
                                        'font-semibold text-press',
                                    line.tone === 'plain' && 'text-ink-soft',
                                )}
                            >
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        'inline-flex size-4 flex-none translate-y-0.5 items-center justify-center rounded-full border-2 text-[9px] leading-none font-extrabold',
                                        line.tone === 'new' &&
                                            'border-press bg-press text-white',
                                        line.tone === 'ready' &&
                                            'border-ink bg-print-green text-ink',
                                        line.tone === 'printed' &&
                                            'border-ink bg-card text-ink',
                                        line.tone === 'plain' &&
                                            'border-line-strong bg-card',
                                    )}
                                >
                                    {line.tone === 'ready' ||
                                    line.tone === 'printed'
                                        ? '✓'
                                        : line.tone === 'new'
                                          ? '!'
                                          : ''}
                                </span>
                                <span className="min-w-0">{line.text}</span>
                            </li>
                        ))}
                    </ul>
                )}
                <div className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1 px-4 pb-3">
                    <Button asChild variant="secondary" className="flex-1">
                        <Link
                            href={editorShow({ locale, edition: edition.id })}
                            aria-label={t('editions.open', {
                                name: edition.name,
                            })}
                            data-edition-link
                        >
                            {t('editions.open_action')}
                        </Link>
                    </Button>
                    <Button asChild variant="secondary" className="flex-1">
                        <Link
                            href={editionPrint({ locale, edition: edition.id })}
                            aria-label={t('editions.print_of', {
                                name: edition.name,
                            })}
                        >
                            {t('editions.print_action')}
                        </Link>
                    </Button>
                    {/* In sight on the card, so a second edition starts from this one (UX 9). */}
                    <Button
                        variant="ghost"
                        className="col-span-2 h-11 text-sm underline-offset-4 hover:underline"
                        disabled={busy}
                        aria-label={t('editions.duplicate_of', {
                            name: edition.name,
                        })}
                        onClick={duplicate}
                    >
                        <CopyIcon size={18} />
                        {t('editions.duplicate_action')}
                    </Button>
                </div>
                <div className="absolute top-4 right-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="icon"
                                aria-label={t('editions.more', {
                                    name: edition.name,
                                })}
                            >
                                <MoreIcon />
                            </Button>
                        </DropdownMenuTrigger>
                        {/* The same ⋯ as an element in the editor; Dupliceren here too (vindbaarheid 1.3). */}
                        <DropdownMenuContent>
                            <DropdownMenuItem
                                disabled={busy}
                                onSelect={duplicate}
                            >
                                {t('editions.duplicate_menu')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={() => {
                                    setName(edition.name);
                                    setRenaming(true);
                                }}
                            >
                                {t('editions.rename')}
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
            </div>
            {failed && (
                <p role="alert" className="m-0 px-4 pb-4 text-sm text-press">
                    {t('editions.action_failed')}
                </p>
            )}

            <Dialog open={renaming} onOpenChange={setRenaming}>
                <DialogContent
                    onOpenAutoFocus={(event) => {
                        // The name is the one field: focus it with the text selected, ready to retype.
                        event.preventDefault();
                        const input =
                            event.currentTarget instanceof HTMLElement
                                ? event.currentTarget.querySelector('input')
                                : null;
                        input?.focus();
                        input?.select();
                    }}
                >
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

                                return { type: 'renamed', name };
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
                            <Button
                                type="submit"
                                disabled={name.trim() === '' || busy}
                            >
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
                            disabled={busy}
                            onClick={() =>
                                void run(async () => {
                                    // The account first: when that fails, nothing is gone and the edition does not return.
                                    await account?.remove(edition.id);
                                    await repository.delete(edition.id);

                                    return { type: 'deleted' };
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
