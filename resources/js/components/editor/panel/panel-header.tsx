import { usePage } from '@inertiajs/react';
import { useState } from 'react';

import { MoreIcon } from '@/components/icons';
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
import { useTranslation } from '@/hooks/use-translation';
import { spaceKey } from '@/lib/edition/keys';
import { isExtraCardKey } from '@/lib/edition/keys';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition } from '@/lib/edition/types';
import { elementLabel, isCustomized } from '@/lib/editor/catalogue';
import { editElement, resetElement } from '@/lib/editor/edit';
import { clearCardChange, removeCardChanges } from '@/lib/editor/extra-cards';
import {
    panelActions,
    resetLosesPhoto,
    type PanelAction,
} from '@/lib/editor/panel-sections';
import { swapChanges, swapTargets } from '@/lib/editor/swap';
import { standardEdition } from '@/lib/game/standard-edition';
import { THEMES } from '@/lib/render/themes';

export interface PanelMenuProps {
    session: EditionSession;
    edition: Edition;
    editKey: string;
    /** The name of the element, for the menu button and the dialogs. */
    title: string;
    /** Called after the element left the set (a pawn, an extra card), so the editor shows another one. */
    onRemoved?: () => void;
    /** Says what happened, for a status line (swapped, removed). */
    onAnnounce?: (text: string) => void;
    /** A button with a word next to the dots, for the phone, where the top bar has the edition menu (§3.6). */
    labelled?: boolean;
}

const ACTION_LABEL: Record<PanelAction, string> = {
    reset: 'editor.reset',
    swap: 'editor.swap_button',
    removePawn: 'editor.pawn_remove',
    removeCard: 'editor.card_remove',
};

/**
 * The ⋯ menu of an element (§3.3, B142): "Terug naar standaard" and what belongs to the type ("Wisselen met…",
 * "Pion weghalen", "Kaart weghalen"). Without any action there is no menu.
 */
export function PanelMenu({
    session,
    edition,
    editKey,
    title,
    onRemoved,
    onAnnounce,
    labelled = false,
}: PanelMenuProps) {
    const t = useTranslation();
    const [confirming, setConfirming] = useState(false);
    const [swapping, setSwapping] = useState(false);
    const actions = panelActions(editKey, edition);

    if (actions.length === 0) {
        return null;
    }

    const reset = (): void => {
        if (isExtraCardKey(editKey)) {
            const change = clearCardChange(session.edition, editKey);
            if (change !== null) {
                session.apply([change]);
            }
        } else if (editKey.startsWith('pawn.')) {
            const hidden = session.edition.elements[editKey]?.hidden;
            resetElement(session, editKey);
            if (hidden === true) {
                editElement(session, editKey, { hidden: true });
            }
        } else {
            resetElement(session, editKey);
        }
        onAnnounce?.(t('editor.reset_done', { name: title }));
    };

    const run = (action: PanelAction): void => {
        switch (action) {
            case 'reset':
                if (resetLosesPhoto(edition.elements[editKey])) {
                    setConfirming(true);
                } else {
                    reset();
                }
                break;
            case 'swap':
                setSwapping(true);
                break;
            case 'removePawn':
                editElement(session, editKey, { hidden: true });
                onAnnounce?.(t('editor.removed', { name: title }));
                onRemoved?.();
                break;
            case 'removeCard':
                session.apply(removeCardChanges(session.edition, editKey));
                onAnnounce?.(t('editor.removed', { name: title }));
                onRemoved?.();
                break;
        }
    };

    return (
        <>
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    {labelled ? (
                        <Button
                            variant="secondary"
                            className="px-4 min-[400px]:px-4"
                            aria-label={t('editor.element_menu', {
                                name: title,
                            })}
                            data-panel-menu
                        >
                            <MoreIcon />
                            {t('editor.element_actions')}
                        </Button>
                    ) : (
                        <Button
                            variant="icon"
                            aria-label={t('editor.element_menu', {
                                name: title,
                            })}
                            data-panel-menu
                        >
                            <MoreIcon />
                        </Button>
                    )}
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-56">
                    {actions.map((action) => (
                        <DropdownMenuItem
                            key={action}
                            data-action={action}
                            onSelect={() => run(action)}
                            className={
                                action === 'removePawn' ||
                                action === 'removeCard'
                                    ? 'text-press'
                                    : undefined
                            }
                        >
                            {t(ACTION_LABEL[action])}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={confirming} onOpenChange={setConfirming}>
                <DialogContent>
                    <DialogTitle>{t('editor.reset_confirm_title')}</DialogTitle>
                    <DialogDescription>
                        {t('editor.reset_confirm_photo', { name: title })}
                    </DialogDescription>
                    <div className="mt-6 flex flex-wrap justify-end gap-2">
                        <DialogClose asChild>
                            <Button variant="secondary">
                                {t('app.cancel')}
                            </Button>
                        </DialogClose>
                        <Button
                            onClick={() => {
                                reset();
                                setConfirming(false);
                            }}
                        >
                            {t('editor.reset')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {actions.includes('swap') && (
                <SwapDialog
                    open={swapping}
                    onOpenChange={setSwapping}
                    session={session}
                    edition={edition}
                    editKey={editKey}
                    title={title}
                    onSwapped={(other) => {
                        setSwapping(false);
                        onAnnounce?.(
                            t('editor.swap_done', { a: title, b: other }),
                        );
                    }}
                />
            )}
        </>
    );
}

interface SwapDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    session: EditionSession;
    edition: Edition;
    editKey: string;
    title: string;
    onSwapped: (other: string) => void;
}

/**
 * "Wisselen met…" from the menu of a street, station or utility: the spaces of the same kind, with their colour,
 * in board order. Dragging on the mini board and W keep working.
 */
function SwapDialog({
    open,
    onOpenChange,
    session,
    edition,
    editKey,
    title,
    onSwapped,
}: SwapDialogProps) {
    const t = useTranslation();
    const { locale } = usePage().props;
    const position = Number(editKey.split('.')[1]);
    const groups = new Map(
        standardEdition.groups.map((group) => [
            group.id,
            edition.elements[`group.${group.id}`]?.color ?? group.color,
        ]),
    );
    const theme = THEMES[edition.theme];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>
                    {t('editor.swap_title', { name: title })}
                </DialogTitle>
                <DialogDescription>{t('editor.swap_intro')}</DialogDescription>
                <ul className="m-0 mt-4 flex max-h-[50dvh] list-none flex-col overflow-auto border-t border-line p-0">
                    {swapTargets(position).map((other) => {
                        const key = spaceKey(other);
                        const space = standardEdition.spaces[other];
                        const name = elementLabel(key, edition, locale);

                        return (
                            <li key={key} className="border-b border-line">
                                <button
                                    type="button"
                                    data-swap-target={key}
                                    onClick={() => {
                                        session.apply(
                                            swapChanges(
                                                session.edition,
                                                position,
                                                other,
                                            ),
                                        );
                                        onSwapped(name);
                                    }}
                                    className="flex min-h-12 w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-2 text-left text-base hover:bg-table"
                                >
                                    <span
                                        aria-hidden="true"
                                        className="rounded-sm size-4 shrink-0 border border-ink"
                                        style={{
                                            background:
                                                space?.type === 'street'
                                                    ? groups.get(space.group)
                                                    : theme.boardBackground,
                                        }}
                                    />
                                    <span className="flex-1">{name}</span>
                                    {isCustomized(edition, key) && (
                                        <span className="text-xs text-ink-soft">
                                            {t('editor.customized')}
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
                <div className="mt-4 flex justify-end">
                    <DialogClose asChild>
                        <Button variant="secondary">{t('dialog.close')}</Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface PanelHeaderProps extends PanelMenuProps {
    /** "Straat · bruin", "Kaart", "Pion 3 van 8". */
    kind: string;
}

/** The head of the field panel (§3.3): title, kind, a dot when changed, and the ⋯ menu. */
export function PanelHeader({ kind, ...menu }: PanelHeaderProps) {
    const t = useTranslation();
    const changed = isCustomized(menu.edition, menu.editKey);

    return (
        <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
                <h2 className="m-0 font-display text-2xl font-extrabold break-words">
                    {menu.title}
                </h2>
                <p className="m-0 flex items-center gap-2 text-sm text-ink-soft">
                    {kind}
                    {changed && (
                        <>
                            <span
                                aria-hidden="true"
                                className="size-2 rounded-full bg-ink"
                            />
                            {t('editor.customized')}
                        </>
                    )}
                </p>
            </div>
            <PanelMenu {...menu} />
        </div>
    );
}
