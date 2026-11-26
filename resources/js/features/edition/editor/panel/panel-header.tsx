import { usePage } from '@inertiajs/react';
import { Fragment, useState, type ReactNode } from 'react';

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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { editElement, resetElement } from '@/features/edition/editor/edit';
import {
    PhotoSwapDialog,
    SwapDialog,
} from '@/features/edition/editor/panel/swap-dialogs';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { isExtraCardKey } from '@/lib/render/edition-keys';
import type { Edition } from '@/lib/render/edition-types';
import { deckLabel, isCustomized } from '@/lib/render/editor-catalogue';
import {
    clearNamesChanges,
    clearNamesDone,
    ownNameKeys,
} from '@/lib/render/editor-clear-names';
import {
    clearCardChange,
    clearDeckChanges,
    deckOfKey,
    removeCardChanges,
} from '@/lib/render/editor-extra-cards';
import {
    panelActions,
    resetLosesPhoto,
    type PanelAction,
} from '@/lib/render/editor-panel-sections';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { cn } from '@/lib/utils';

export type PanelMenuProps = {
    session: EditionSession;
    edition: Edition;
    editKey: string;
    /** The name of the element, for the menu button and the dialogs. */
    title: string;
    /** Called after the element left the set (a pawn, an extra card), so the editor shows another one. */
    onRemoved?: () => void;
    /** Says what happened, for a status line (swapped, removed). */
    onAnnounce?: (text: string) => void;
    /** The photos of this browser, for "Foto wisselen met…" (B238). */
    photos?: PhotoInfos;
};

const ACTION_LABEL: Record<PanelAction, string> = {
    reset: 'editor.reset',
    swap: 'editor.swap_button',
    swapPhoto: 'editor.photo_swap_button',
    removePawn: 'editor.pawn_remove',
    removeCard: 'editor.card_remove',
    clearDeck: 'editor.clear_deck',
    clearNames: 'editor.clear_names',
};

export type ElementActions = {
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
};

const resetOf = (session: EditionSession, editKey: string): void => {
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
};

const ResetDialog = ({
    open,
    onOpenChange,
    title,
    onReset,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    onReset: () => void;
}) => {
    const t = useTranslation();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>{t('editor.reset_confirm_title')}</DialogTitle>
                <DialogDescription>
                    {t('editor.reset_confirm_photo', { name: title })}
                </DialogDescription>
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                    <DialogClose asChild>
                        <Button variant="secondary">{t('app.cancel')}</Button>
                    </DialogClose>
                    <Button onClick={onReset}>{t('editor.reset')}</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

/**
 * The actions of an element (§3.3, B142): what belongs to the type ("Wisselen met…", "Pion weghalen", "Kaart
 * weghalen", "Kaarten leegmaken") and, last, "Terug naar standaard", as menu items with their dialogs. The desktop shows them in the ⋯ menu of the
 * panel head; the phone puts them on top of the one menu in its top bar (B151).
 */
export const useElementActions = ({
    session,
    edition,
    editKey,
    title,
    onRemoved,
    onAnnounce,
    photos,
}: PanelMenuProps): ElementActions => {
    const t = useTranslation();
    const { locale } = usePage().props;
    const [confirming, setConfirming] = useState(false);
    const [swapping, setSwapping] = useState(false);
    const [swappingPhoto, setSwappingPhoto] = useState(false);
    // What you came to do first, "Terug naar standaard" last (vindbaarheid point 15, UX 10).
    const actions = [
        ...panelActions(editKey, edition).filter(
            (action) => action !== 'reset',
        ),
        ...panelActions(editKey, edition).filter(
            (action) => action === 'reset',
        ),
    ];
    const deck = deckOfKey(editKey);
    const deckName = deck === undefined ? '' : deckLabel(edition, deck, locale);

    const reset = (): void => {
        resetOf(session, editKey);
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
            case 'swapPhoto':
                setSwappingPhoto(true);
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
                {
                    const kept = ownNameKeys(session.edition).length;
                    session.apply(clearNamesChanges(session.edition));
                    onAnnounce?.(clearNamesDone(t, kept));
                }
                break;
        }
    };

    const label = (action: PanelAction): string =>
        t(ACTION_LABEL[action], { deck: deckName });

    const items = actions.map((action, index) => (
        <Fragment key={action}>
            {action === 'reset' && index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
                data-action={action}
                onSelect={() => run(action)}
                className={cn(
                    'font-semibold',
                    (action === 'removePawn' || action === 'removeCard') &&
                        'text-press',
                )}
            >
                {label(action)}
            </DropdownMenuItem>
        </Fragment>
    ));

    const dialogs = (
        <>
            <ResetDialog
                open={confirming}
                onOpenChange={setConfirming}
                title={title}
                onReset={() => {
                    reset();
                    setConfirming(false);
                }}
            />

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
            {actions.includes('swapPhoto') && (
                <PhotoSwapDialog
                    open={swappingPhoto}
                    onOpenChange={setSwappingPhoto}
                    session={session}
                    edition={edition}
                    editKey={editKey}
                    title={title}
                    photos={photos}
                    onDone={(text) => {
                        setSwappingPhoto(false);
                        onAnnounce?.(text);
                    }}
                />
            )}
        </>
    );

    return { actions, items, dialogs, run, label };
};

/**
 * The ⋯ menu in the head of the field panel (desktop and tablet), as shadcn's DropdownMenu. It always opens
 * downwards under its button and never flips up, so it does not cover the title or the switch Vak / Eigendomsbewijs
 * above the panel (bug 33, ronde 3; designcheck ronde 4). Without any action there is no menu.
 */
const PanelMenu = (props: PanelMenuProps) => {
    const t = useTranslation();
    const menu = useElementActions(props);

    if (menu.actions.length === 0) {
        return null;
    }

    const name = t('editor.element_menu', { name: props.title });

    return (
        <>
            {/* A new element starts with the menu closed. */}
            <DropdownMenu key={props.editKey}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="icon"
                        aria-label={name}
                        data-panel-menu
                        className="data-[state=open]:bg-ink data-[state=open]:text-paper"
                    >
                        <MoreIcon />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    side="bottom"
                    align="end"
                    avoidCollisions={false}
                    aria-label={name}
                    data-element-menu
                    className="w-64 max-w-[calc(100vw-2rem)] bg-paper"
                >
                    {menu.items}
                </DropdownMenuContent>
            </DropdownMenu>
            {menu.dialogs}
        </>
    );
};

type PanelHeaderProps = {
    /** "Straat · bruin", "Kaart", "Pion 3 van 8". */
    kind: string;
} & PanelMenuProps;

/** The head of the field panel (§3.3): title, kind, a dot when changed, and the ⋯ menu. */
export const PanelHeader = ({ kind, ...menu }: PanelHeaderProps) => {
    const t = useTranslation();
    const changed = isCustomized(menu.edition, menu.editKey);

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
                <PanelMenu {...menu} />
            </div>
        </div>
    );
};
