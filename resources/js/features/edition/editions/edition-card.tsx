import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';

import type { AccountActions } from '@/features/edition/editor/account-actions';
import {
    NO_STATUS,
    type EditionStatus,
} from '@/features/edition/use-edition-status';
import { useServices } from '@/features/edition/use-editions';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';
import { formatDateTime } from '@/lib/datetime';
import type { EditionSummary } from '@/lib/render/edition-types';
import type { PrintedState } from '@/lib/render/print-printed';
import { cn } from '@/lib/utils';
import { show as editorShow } from '@/routes/editor';

import { DeleteDialog, RenameDialog } from './edition-card-dialogs';
import {
    CardButtons,
    CardMenu,
    CardSummary,
    CardThumbnail,
} from './edition-card-parts';
import { StatusLines, statusLines } from './edition-status-lines';

export type EditionChange =
    | { type: 'renamed'; name: string }
    | { type: 'duplicated'; name: string }
    | { type: 'deleted' };

type EditionCardProps = {
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
};

const TILT = [
    'md:-rotate-1',
    'md:rotate-[0.8deg]',
    'md:-rotate-[0.4deg]',
    'md:rotate-1',
] as const;

const formatDate = (at: number, locale: string): string => {
    return formatDateTime(at, locale === 'nl' ? 'nl-NL' : 'en-GB', {
        day: 'numeric',
        month: 'short',
    });
};

const useEditionActions = (
    edition: EditionSummary,
    account: AccountActions | null,
    onChanged: (change: EditionChange) => void,
) => {
    const { locale } = usePage().props;
    const { repository } = useServices();
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

    const rename = (name: string): Promise<boolean> =>
        run(async () => {
            await repository.rename(edition.id, name);
            await account?.rename(edition.id, name);

            return { type: 'renamed', name };
        });

    const remove = (): Promise<boolean> =>
        run(async () => {
            // The account first: when that fails, nothing is gone and the edition does not return.
            await account?.remove(edition.id);
            await repository.delete(edition.id);

            return { type: 'deleted' };
        });

    return { failed, busy, duplicate, rename, remove };
};

type EditionActions = ReturnType<typeof useEditionActions>;

type CardDialogsProps = {
    edition: EditionSummary;
    inAccount: boolean;
    actions: EditionActions;
    renaming: boolean;
    onRenamingChange: (open: boolean) => void;
    deleting: boolean;
    onDeletingChange: (open: boolean) => void;
    name: string;
    onNameChange: (name: string) => void;
};

const CardDialogs = ({
    edition,
    inAccount,
    actions,
    renaming,
    onRenamingChange,
    deleting,
    onDeletingChange,
    name,
    onNameChange,
}: CardDialogsProps) => (
    <>
        <RenameDialog
            open={renaming}
            onOpenChange={onRenamingChange}
            name={name}
            onNameChange={onNameChange}
            failed={actions.failed}
            busy={actions.busy}
            onRename={() =>
                void actions.rename(name).then((ok) => {
                    if (ok) {
                        onRenamingChange(false);
                    }
                })
            }
        />
        <DeleteDialog
            open={deleting}
            onOpenChange={onDeletingChange}
            name={edition.name}
            inAccount={inAccount}
            failed={actions.failed}
            busy={actions.busy}
            onDelete={() =>
                void actions.remove().then((ok) => {
                    if (ok) {
                        onDeletingChange(false);
                    }
                })
            }
        />
    </>
);

/** One edition in Mijn edities: board thumbnail, name, and the menu with Rename, Duplicate and Delete (B96). */
export const EditionCard = ({
    edition,
    onChanged,
    account = null,
    inAccount = false,
    status = NO_STATUS,
    tilt = 0,
    printed,
}: EditionCardProps) => {
    const t = useTranslation();
    const tc = useTranslationChoice();
    const { locale } = usePage().props;
    const [renaming, setRenaming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [name, setName] = useState(edition.name);
    const actions = useEditionActions(edition, account, onChanged);
    const { failed, busy } = actions;
    const date = (at: number): string => formatDate(at, locale);
    const lines = statusLines(status, printed, { t, tc, date });

    return (
        <li
            className={cn(
                'relative flex flex-col overflow-hidden rounded-control border-2 border-ink bg-card shadow-paper',
                'motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-1 motion-safe:hover:rotate-0',
                TILT[tilt % TILT.length],
            )}
        >
            <CardThumbnail edition={edition} />
            {/* The menu sits top right but comes last in the tab order, after Openen (ronde 3, designcheck ronde 4). */}
            <div className="relative flex flex-1 flex-col">
                <CardSummary
                    edition={edition}
                    inAccount={inAccount}
                    edited={date(edition.updatedAt)}
                />
                {lines.length > 0 && <StatusLines lines={lines} />}
                <CardButtons
                    edition={edition}
                    busy={busy}
                    onDuplicate={actions.duplicate}
                />
                <CardMenu
                    name={edition.name}
                    busy={busy}
                    onDuplicate={actions.duplicate}
                    onRename={() => {
                        setName(edition.name);
                        setRenaming(true);
                    }}
                    onDelete={() => setDeleting(true)}
                />
            </div>
            {failed && (
                <p role="alert" className="m-0 px-4 pb-4 text-sm text-press">
                    {t('editions.action_failed')}
                </p>
            )}

            <CardDialogs
                edition={edition}
                inAccount={inAccount}
                actions={actions}
                renaming={renaming}
                onRenamingChange={setRenaming}
                deleting={deleting}
                onDeletingChange={setDeleting}
                name={name}
                onNameChange={setName}
            />
        </li>
    );
};
