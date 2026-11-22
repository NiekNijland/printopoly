import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

import {
    ChevronDownIcon,
    ChevronLeftIcon,
    RedoIcon,
    UndoIcon,
} from '@/components/icons';
import { LogoMark } from '@/components/logo';
import { RegistrationStrip } from '@/components/registration-strip';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useKeyboardHints } from '@/hooks/use-media-query';
import { useTranslation } from '@/hooks/use-translation';
import { shortcutKeys, shortcutProps } from '@/lib/editor/shortcuts';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { index as editionsIndex } from '@/routes/editions';

/** What the menu under the edition name does (B144): the actions on the whole edition. */
interface NameMenuActions {
    onSettings?: () => void;
    /** "Samen maken" (B146): the section in the edition panel; the count is what waits. */
    onCollect?: () => void;
    collectCount?: number;
    onShortcuts?: () => void;
    onDuplicate?: () => void;
    /** "Deel je bord" (B202): a picture of the board for the group chat. */
    onShare?: () => void;
    /** On a phone the menu also holds Voorbeeld, which the bottom bar has no room for on an element. */
    onPreview?: () => void;
    /** On a phone on an element or the edition, the header with Printen makes way, so Printen is here too. */
    printHref?: string;
    /**
     * "Alle namen op het bord leegmaken" (B258): an action on the whole board, so it is in this menu too (B143
     * point 4), not only in the menu of one street. Left out when there is nothing to clear.
     */
    onClearNames?: () => void;
}

interface NameMenuProps extends NameMenuActions {
    editionName: string;
    /**
     * On a phone, on an element: the element's own actions (Terug naar standaard, Wisselen met…, Kaart weghalen) on
     * top of the menu, so the top bar has one menu (B151).
     */
    element?: { title: string; items: ReactNode };
    /** The button that opens the menu. */
    children: ReactNode;
}

/** The small red dot that says friends sent something (B146). */
export function WaitingDot({ className }: { className?: string }) {
    return (
        <span
            aria-hidden="true"
            data-waiting-dot
            className={cn(
                'size-2.5 flex-none rounded-full border border-card bg-press',
                className,
            )}
        />
    );
}

/** A small heading above a group of items, for the phone's menu with two groups (B151). */
function MenuGroupLabel({ children }: { children: ReactNode }) {
    return (
        <DropdownMenuLabel className="truncate px-3 pt-2 pb-1 font-mono text-xs font-normal text-ink-soft">
            {children}
        </DropdownMenuLabel>
    );
}

/** An item with one line under it that says what it is for (vindbaarheid point 13). */
function ItemText({ title, hint }: { title: string; hint: string }) {
    return (
        <span className="flex min-w-0 flex-col">
            <span>{title}</span>
            <span className="text-sm font-normal text-ink-soft">{hint}</span>
        </span>
    );
}

/**
 * The name menu (B144): Editie-instellingen, Samen maken with what waits, Sneltoetsen, Deel je bord (B202) and
 * Dupliceren. The same
 * menu at every width; a phone adds Voorbeeld and the way back to Mijn edities, and on an element puts that
 * element's actions on top (B151).
 */
export function NameMenu({
    editionName,
    element,
    children,
    onSettings,
    onCollect,
    collectCount = 0,
    onShortcuts,
    onDuplicate,
    onShare,
    onPreview,
    printHref,
    onClearNames,
}: NameMenuProps) {
    const t = useTranslation();
    const { locale } = usePage().props;
    const hint = 'pl-6 font-mono text-xs text-ink-soft';
    const keys = useKeyboardHints();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
            <DropdownMenuContent
                align={element === undefined ? 'start' : 'end'}
                className="max-w-[calc(100vw-2rem)] min-w-64"
                aria-label={
                    element === undefined
                        ? t('editor.name_menu', { name: editionName })
                        : t('editor.element_name_menu', {
                              element: element.title,
                              name: editionName,
                          })
                }
            >
                {element !== undefined && (
                    <>
                        <MenuGroupLabel>{element.title}</MenuGroupLabel>
                        {element.items}
                        <DropdownMenuSeparator />
                        <MenuGroupLabel>{editionName}</MenuGroupLabel>
                    </>
                )}
                {onSettings !== undefined && (
                    <DropdownMenuItem onSelect={onSettings}>
                        {t('editor.menu_settings')}
                        {keys && (
                            <DropdownMenuShortcut
                                className={cn(hint, 'hidden md:inline')}
                            >
                                {shortcutKeys('edition')}
                            </DropdownMenuShortcut>
                        )}
                    </DropdownMenuItem>
                )}
                {onCollect !== undefined && (
                    <DropdownMenuItem onSelect={onCollect}>
                        <ItemText
                            title={t('collect.button')}
                            hint={t('editor.menu_collect_hint')}
                        />
                        {collectCount > 0 && (
                            <span className="ml-auto rounded-full bg-press px-2 py-0.5 text-sm font-semibold text-white">
                                {t('editor.menu_new', { count: collectCount })}
                            </span>
                        )}
                    </DropdownMenuItem>
                )}
                {onPreview !== undefined && (
                    <DropdownMenuItem
                        onSelect={onPreview}
                        className="lg:hidden"
                    >
                        {t('editor.preview_button')}
                    </DropdownMenuItem>
                )}
                {/* Only with a keyboard: a phone or a tablet without one has no keys (Gerda, Emma: R5-18). */}
                {onShortcuts !== undefined && keys && (
                    <DropdownMenuItem onSelect={onShortcuts}>
                        {t('shortcuts.open')}
                        <DropdownMenuShortcut className={hint}>
                            ?
                        </DropdownMenuShortcut>
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onShare !== undefined && (
                    <DropdownMenuItem onSelect={onShare}>
                        <ItemText
                            title={t('editor.share_board')}
                            hint={t('editor.share_board_hint')}
                        />
                    </DropdownMenuItem>
                )}
                {onDuplicate !== undefined && (
                    <DropdownMenuItem onSelect={onDuplicate}>
                        <ItemText
                            title={t('editor.menu_duplicate')}
                            hint={t('editor.menu_duplicate_hint')}
                        />
                    </DropdownMenuItem>
                )}
                {onClearNames !== undefined && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={onClearNames}>
                            <ItemText
                                title={t('editor.clear_names')}
                                hint={t('editor.clear_names_hint')}
                            />
                        </DropdownMenuItem>
                    </>
                )}
                {printHref !== undefined && (
                    <DropdownMenuItem asChild className="md:hidden">
                        <Link href={printHref} className="no-underline">
                            {t('editor.print')}
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild className="md:hidden">
                    <Link href={editionsIndex(locale)} className="no-underline">
                        {t('editor.menu_editions')}
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export interface EditorHeaderProps {
    editionName: string;
    /** The save status, e.g. "Bewaard op dit toestel · Inloggen met Google" (B92). */
    saveStatus?: ReactNode;
    printHref?: string;
    canUndo?: boolean;
    canRedo?: boolean;
    onOpenPreview?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    /** The menu under the edition name (B144). */
    menu?: NameMenuActions;
    /**
     * On a phone an element or the edition has its own top bar with one back arrow (B144, §3.6); the header
     * makes way for it.
     */
    phoneBar?: ReactNode;
}

/**
 * The editor header on one line of 64 px (B144): logo, back to Mijn edities, the edition name with its menu,
 * the save status with a small undo and redo, then Voorbeeld and Printen. No Controle and no counter: messages stay
 * at their element and come together before printing (B197). On a phone: logo, name and Printen; the rest is in
 * the bottom bar.
 */
export function EditorHeader({
    editionName,
    saveStatus,
    printHref,
    canUndo = false,
    canRedo = false,
    onOpenPreview,
    onUndo,
    onRedo,
    menu = {},
    phoneBar,
}: EditorHeaderProps) {
    const { locale } = usePage().props;
    const t = useTranslation();
    const waiting = (menu.collectCount ?? 0) > 0;

    return (
        <header className="flex-none border-b-2 border-ink bg-card">
            {/* The page heading for screen readers; the name menu shows the name (UX 8, ronde 3). */}
            <h1 className="sr-only">{editionName}</h1>
            <RegistrationStrip className="h-1" />
            {phoneBar !== undefined && (
                <div className="flex h-16 items-center gap-2 px-3 md:hidden low:h-12">
                    {phoneBar}
                </div>
            )}
            <div
                className={cn(
                    'h-16 min-w-0 items-center gap-1 px-3 min-[400px]:gap-2 md:gap-3 lg:px-4 low:h-12',
                    phoneBar === undefined ? 'flex' : 'hidden md:flex',
                )}
            >
                <Link
                    href={home(locale)}
                    aria-label="Printopoly"
                    className="inline-flex size-12 flex-none items-center justify-center no-underline"
                >
                    <LogoMark size={32} />
                </Link>
                <Link
                    href={editionsIndex(locale)}
                    aria-label={t('editor.back_to_editions')}
                    className="hidden min-h-12 min-w-11 flex-none items-center justify-center gap-1 px-1 text-sm font-semibold no-underline hover:text-press md:inline-flex"
                >
                    <ChevronLeftIcon size={16} />
                    {/* Below 1280 px the arrow alone, so the edition name keeps its room (bug 39). */}
                    <span className="hidden xl:inline">
                        {t('editor.back_to_editions')}
                    </span>
                </Link>

                <NameMenu editionName={editionName} {...menu}>
                    <Button
                        variant="ghost"
                        className="relative min-w-0 shrink gap-1 px-2 font-display text-lg font-extrabold lg:max-w-72 lg:text-xl"
                        aria-label={t(
                            waiting
                                ? 'editor.name_menu_waiting'
                                : 'editor.name_menu',
                            { name: editionName },
                        )}
                    >
                        {/* A long name gets a smaller letter and a second line instead of "…" (bug 24). */}
                        <span
                            data-edition-name
                            className={cn(
                                'line-clamp-2 text-left leading-tight break-words whitespace-normal',
                                editionName.length > 40
                                    ? 'text-sm lg:text-base'
                                    : editionName.length > 22 &&
                                          'text-base lg:text-lg',
                            )}
                        >
                            {editionName}
                        </span>
                        <ChevronDownIcon size={16} className="flex-none" />
                        {waiting && (
                            <WaitingDot className="absolute top-2 right-0" />
                        )}
                    </Button>
                </NameMenu>

                {saveStatus !== undefined && (
                    <p className="m-0 hidden min-w-0 truncate text-sm text-ink-soft xl:block">
                        {saveStatus}
                    </p>
                )}
                <div className="hidden flex-none items-center gap-1 md:flex">
                    <Button
                        variant="ghost"
                        className="size-11 px-0"
                        aria-label={t('editor.undo')}
                        {...shortcutProps('undo', t('editor.undo'))}
                        disabled={!canUndo}
                        onClick={onUndo}
                    >
                        <UndoIcon size={18} />
                    </Button>
                    <Button
                        variant="ghost"
                        className="size-11 px-0"
                        aria-label={t('editor.redo')}
                        {...shortcutProps('redo', t('editor.redo'))}
                        disabled={!canRedo}
                        onClick={onRedo}
                    >
                        <RedoIcon size={18} />
                    </Button>
                </div>

                <div className="flex-1" />

                <div className="hidden flex-none items-center gap-3 md:flex">
                    {onOpenPreview !== undefined && (
                        // On a tablet Voorbeeld is in the name menu, so the name keeps its room.
                        <Button
                            variant="secondary"
                            className="hidden lg:inline-flex"
                            data-preview-toggle
                            {...shortcutProps(
                                'preview',
                                t('editor.preview_button'),
                            )}
                            onClick={onOpenPreview}
                        >
                            {t('editor.preview_button')}
                        </Button>
                    )}
                </div>
                {printHref !== undefined && (
                    <Button asChild className="flex-none">
                        <Link
                            href={printHref}
                            {...shortcutProps('print', t('editor.print'))}
                        >
                            {t('editor.print')}
                        </Link>
                    </Button>
                )}
            </div>
        </header>
    );
}
