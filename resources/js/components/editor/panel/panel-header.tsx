import { usePage } from '@inertiajs/react';
import {
    useEffect,
    useId,
    useRef,
    useState,
    type KeyboardEvent,
    type ReactNode,
} from 'react';

import { MoreIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/hooks/use-translation';
import { spaceKey } from '@/lib/edition/keys';
import { isExtraCardKey } from '@/lib/edition/keys';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition } from '@/lib/edition/types';
import { deckLabel, elementLabel, isCustomized } from '@/lib/editor/catalogue';
import { clearNamesChanges } from '@/lib/editor/clear-names';
import { editElement, resetElement } from '@/lib/editor/edit';
import {
    clearCardChange,
    clearDeckChanges,
    deckOfKey,
    removeCardChanges,
} from '@/lib/editor/extra-cards';
import {
    panelActions,
    resetLosesPhoto,
    type PanelAction,
} from '@/lib/editor/panel-sections';
import { swapChanges, swapTargets } from '@/lib/editor/swap';
import { standardEdition } from '@/lib/game/standard-edition';
import { THEMES } from '@/lib/render/themes';
import { cn } from '@/lib/utils';

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
}

const ACTION_LABEL: Record<PanelAction, string> = {
    reset: 'editor.reset',
    swap: 'editor.swap_button',
    removePawn: 'editor.pawn_remove',
    removeCard: 'editor.card_remove',
    clearDeck: 'editor.clear_deck',
    clearNames: 'editor.clear_names',
};

export interface ElementActions {
    /** What this element offers; empty means no menu. */
    actions: PanelAction[];
    /** The menu items, for a menu of its own or the top of the phone's menu (B151). */
    items: ReactNode;
    /** The question before a reset that loses a photo, and "Wisselen met…". */
    dialogs: ReactNode;
    /** Runs an action, as its menu item does. */
    run: (action: PanelAction) => void;
    /** The words of an action in the menu ("Alle kaarten van Kans leegmaken"). */
    label: (action: PanelAction) => string;
}

/**
 * The actions of an element (§3.3, B142): "Terug naar standaard" and what belongs to the type ("Wisselen met…",
 * "Pion weghalen", "Kaart weghalen"), as menu items with their dialogs. The desktop shows them in the ⋯ menu of the
 * panel head; the phone puts them on top of the one menu in its top bar (B151).
 */
export function useElementActions({
    session,
    edition,
    editKey,
    title,
    onRemoved,
    onAnnounce,
}: PanelMenuProps): ElementActions {
    const t = useTranslation();
    const { locale } = usePage().props;
    const [confirming, setConfirming] = useState(false);
    const [swapping, setSwapping] = useState(false);
    const actions = panelActions(editKey, edition);
    const deck = deckOfKey(editKey);
    const deckName = deck === undefined ? '' : deckLabel(edition, deck, locale);

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
            case 'clearDeck':
                // One undo step brings every text back (B194).
                if (deck !== undefined) {
                    session.apply(clearDeckChanges(session.edition, deck));
                    onAnnounce?.(
                        t('editor.clear_deck_done', { deck: deckName }),
                    );
                }
                break;
            case 'clearNames':
                // One undo step brings every name back (B201).
                session.apply(clearNamesChanges(session.edition));
                onAnnounce?.(t('editor.clear_names_done'));
                break;
        }
    };

    const label = (action: PanelAction): string =>
        t(ACTION_LABEL[action], { deck: deckName });

    const items = actions.map((action) => (
        <DropdownMenuItem
            key={action}
            data-action={action}
            onSelect={() => run(action)}
            className={
                action === 'removePawn' || action === 'removeCard'
                    ? 'text-press'
                    : undefined
            }
        >
            {label(action)}
        </DropdownMenuItem>
    ));

    const dialogs = (
        <>
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

    return { actions, items, dialogs, run, label };
}

/**
 * The ⋯ menu in the head of the field panel (desktop and tablet). It opens in the panel itself, right under its
 * button, and pushes the fields down: a floating menu always lay over something, the title (bug 33, ronde 3) or
 * the switch Vak / Eigendomsbewijs at 1024 px (designcheck ronde 4). Inside the panel it covers nothing at any
 * width and scrolls along with it (B179). Without any action there is no menu.
 */
function usePanelMenu(props: PanelMenuProps): {
    trigger: ReactNode;
    list: ReactNode;
} {
    const t = useTranslation();
    const menu = useElementActions(props);
    const button = useRef<HTMLButtonElement>(null);
    const list = useRef<HTMLDivElement>(null);
    const menuId = useId();
    // Open for one element: choosing another element closes it.
    const [openFor, setOpenFor] = useState<string | null>(null);
    const open = openFor === props.editKey;

    const close = (focusButton: boolean): void => {
        setOpenFor(null);
        if (focusButton) {
            button.current?.focus();
        }
    };

    // A click anywhere else closes it, as a menu does.
    useEffect(() => {
        if (!open) {
            return undefined;
        }
        const onPointerDown = (event: PointerEvent): void => {
            const target = event.target;
            if (
                target instanceof Node &&
                !list.current?.contains(target) &&
                !button.current?.contains(target)
            ) {
                setOpenFor(null);
            }
        };
        document.addEventListener('pointerdown', onPointerDown);

        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [open]);

    // The first item gets the focus when the menu opens.
    useEffect(() => {
        if (open) {
            list.current
                ?.querySelector<HTMLElement>('[role="menuitem"]')
                ?.focus();
        }
    }, [open]);

    if (menu.actions.length === 0) {
        return { trigger: null, list: null };
    }

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
        const items = [
            ...(list.current?.querySelectorAll<HTMLElement>(
                '[role="menuitem"]',
            ) ?? []),
        ];
        const at = items.findIndex((item) => item === document.activeElement);
        const move = (index: number): void => {
            event.preventDefault();
            items[(index + items.length) % items.length]?.focus();
        };
        switch (event.key) {
            case 'ArrowDown':
                move(at + 1);
                break;
            case 'ArrowUp':
                move(at - 1);
                break;
            case 'Home':
                move(0);
                break;
            case 'End':
                move(items.length - 1);
                break;
            case 'Escape':
                event.preventDefault();
                event.stopPropagation();
                close(true);
                break;
            case 'Tab':
                setOpenFor(null);
                break;
        }
    };

    return {
        trigger: (
            <>
                <Button
                    ref={button}
                    variant="icon"
                    aria-label={t('editor.element_menu', {
                        name: props.title,
                    })}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    aria-controls={open ? menuId : undefined}
                    data-panel-menu
                    data-state={open ? 'open' : 'closed'}
                    onClick={() => setOpenFor(open ? null : props.editKey)}
                    className="data-[state=open]:bg-ink data-[state=open]:text-paper"
                >
                    <MoreIcon />
                </Button>
                {menu.dialogs}
            </>
        ),
        list: open ? (
            <div
                ref={list}
                id={menuId}
                role="menu"
                tabIndex={-1}
                aria-label={t('editor.element_menu', { name: props.title })}
                data-element-menu
                onKeyDown={onKeyDown}
                className="ml-auto flex w-full max-w-64 flex-col rounded-control border-2 border-ink bg-paper p-1 shadow-paper"
            >
                {menu.actions.map((action, index) => (
                    <button
                        key={action}
                        type="button"
                        role="menuitem"
                        tabIndex={index === 0 ? 0 : -1}
                        data-action={action}
                        onClick={() => {
                            close(action === 'reset');
                            menu.run(action);
                        }}
                        className={cn(
                            'flex min-h-11 w-full cursor-pointer items-center rounded-control border-0 bg-transparent px-3 text-left text-base font-semibold text-ink hover:bg-table focus-visible:bg-table',
                            (action === 'removePawn' ||
                                action === 'removeCard') &&
                                'text-press',
                        )}
                    >
                        {menu.label(action)}
                    </button>
                ))}
            </div>
        ) : null,
    };
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
    const panelMenu = usePanelMenu(menu);

    return (
        <div className="flex flex-col gap-2">
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
                {panelMenu.trigger}
            </div>
            {panelMenu.list}
        </div>
    );
}
