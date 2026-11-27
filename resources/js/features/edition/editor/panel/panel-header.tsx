import { usePage } from '@inertiajs/react';
import { Fragment, useState, type ReactNode } from 'react';

import { MoreIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
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
    ResetDialog,
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

type OpenDialog = 'reset' | 'swap' | 'swapPhoto' | null;

type EditAction = 'removePawn' | 'removeCard' | 'clearDeck' | 'clearNames';

const runEdit = (
    { session, editKey, title, onRemoved }: PanelMenuProps,
    action: EditAction,
    t: ReturnType<typeof useTranslation>,
    deckName: string,
): string | null => {
    const deck = deckOfKey(editKey);
    switch (action) {
        case 'removePawn':
            editElement(session, editKey, { hidden: true });
            onRemoved?.();

            return t('editor.removed', { name: title });
        case 'removeCard':
            session.apply(removeCardChanges(session.edition, editKey));
            onRemoved?.();

            return t('editor.removed', { name: title });
        case 'clearDeck':
            // One undo step brings every text back (B194).
            if (deck === undefined) {
                return null;
            }
            session.apply(clearDeckChanges(session.edition, deck));

            return t('editor.clear_deck_done', { deck: deckName });
        case 'clearNames': {
            // One undo step brings every name back (B201).
            const kept = ownNameKeys(session.edition).length;
            session.apply(clearNamesChanges(session.edition));

            return clearNamesDone(t, kept);
        }
    }
};

const ActionItems = ({
    actions,
    run,
    label,
}: {
    actions: PanelAction[];
    run: (action: PanelAction) => void;
    label: (action: PanelAction) => string;
}) =>
    actions.map((action, index) => (
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

const ActionDialogs = ({
    open,
    onOpen,
    actions,
    onReset,
    ...menu
}: PanelMenuProps & {
    open: OpenDialog;
    onOpen: (dialog: OpenDialog) => void;
    actions: PanelAction[];
    onReset: () => void;
}) => {
    const t = useTranslation();
    const { session, edition, editKey, title, onAnnounce } = menu;
    const toggle = (dialog: OpenDialog) => (next: boolean) =>
        onOpen(next ? dialog : null);

    return (
        <>
            <ResetDialog
                open={open === 'reset'}
                onOpenChange={toggle('reset')}
                title={title}
                onReset={() => {
                    onReset();
                    onOpen(null);
                }}
            />

            {actions.includes('swap') && (
                <SwapDialog
                    open={open === 'swap'}
                    onOpenChange={toggle('swap')}
                    session={session}
                    edition={edition}
                    editKey={editKey}
                    title={title}
                    onSwapped={(other) => {
                        onOpen(null);
                        onAnnounce?.(
                            t('editor.swap_done', { a: title, b: other }),
                        );
                    }}
                />
            )}
            {actions.includes('swapPhoto') && (
                <PhotoSwapDialog
                    open={open === 'swapPhoto'}
                    onOpenChange={toggle('swapPhoto')}
                    session={session}
                    edition={edition}
                    editKey={editKey}
                    title={title}
                    photos={menu.photos}
                    onDone={(text) => {
                        onOpen(null);
                        onAnnounce?.(text);
                    }}
                />
            )}
        </>
    );
};

/**
 * The actions of an element (§3.3, B142): what belongs to the type ("Wisselen met…", "Pion weghalen", "Kaart
 * weghalen", "Kaarten leegmaken") and, last, "Terug naar standaard", as menu items with their dialogs. The desktop shows them in the ⋯ menu of the
 * panel head; the phone puts them on top of the one menu in its top bar (B151).
 */
export const useElementActions = (menu: PanelMenuProps): ElementActions => {
    const { session, edition, editKey, title, onAnnounce } = menu;
    const t = useTranslation();
    const { locale } = usePage().props;
    const [open, setOpen] = useState<OpenDialog>(null);
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
        if (action === 'reset') {
            if (resetLosesPhoto(edition.elements[editKey])) {
                setOpen('reset');
            } else {
                reset();
            }
        } else if (action === 'swap' || action === 'swapPhoto') {
            setOpen(action);
        } else {
            const text = runEdit(menu, action, t, deckName);
            if (text !== null) {
                onAnnounce?.(text);
            }
        }
    };
    const label = (action: PanelAction): string =>
        t(ACTION_LABEL[action], { deck: deckName });

    return {
        actions,
        items: <ActionItems actions={actions} run={run} label={label} />,
        dialogs: (
            <ActionDialogs
                {...menu}
                open={open}
                onOpen={setOpen}
                actions={actions}
                onReset={reset}
            />
        ),
        run,
        label,
    };
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
