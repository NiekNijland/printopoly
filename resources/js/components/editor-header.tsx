import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

import {
    ChevronDownIcon,
    ChevronLeftIcon,
    RedoIcon,
    UndoIcon,
    WarningIcon,
} from '@/components/icons';
import { LogoMark } from '@/components/logo';
import { RegistrationStrip } from '@/components/registration-strip';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/hooks/use-translation';
import { shortcutKeys, shortcutProps } from '@/lib/editor/shortcuts';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { index as editionsIndex } from '@/routes/editions';

/** What the menu under the edition name does (B144): the actions on the whole edition. */
export interface NameMenuActions {
    onSettings?: () => void;
    /** "Samen maken" (B146): the section in the edition panel; the count is what waits. */
    onCollect?: () => void;
    collectCount?: number;
    onShortcuts?: () => void;
    onDuplicate?: () => void;
    /** On a phone the menu also holds Voorbeeld, which the bottom bar has no room for on an element. */
    onPreview?: () => void;
    /** On a phone on an element or the edition, the header with Printen makes way, so Printen is here too. */
    printHref?: string;
}

interface NameMenuProps extends NameMenuActions {
    editionName: string;
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

/**
 * The name menu (B144): Editie-instellingen, Samen maken with what waits, Sneltoetsen and Dupliceren. The same
 * menu at every width; a phone adds Voorbeeld and the way back to Mijn edities.
 */
export function NameMenu({
    editionName,
    children,
    onSettings,
    onCollect,
    collectCount = 0,
    onShortcuts,
    onDuplicate,
    onPreview,
    printHref,
}: NameMenuProps) {
    const t = useTranslation();
    const { locale } = usePage().props;
    const hint = 'ml-auto pl-6 font-mono text-xs text-ink-soft';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="min-w-64"
                aria-label={t('editor.name_menu', { name: editionName })}
            >
                {onSettings !== undefined && (
                    <DropdownMenuItem onSelect={onSettings}>
                        {t('editor.menu_settings')}
                        <span className={cn(hint, 'hidden lg:inline')}>
                            {shortcutKeys('edition')}
                        </span>
                    </DropdownMenuItem>
                )}
                {onCollect !== undefined && (
                    <DropdownMenuItem onSelect={onCollect}>
                        {t('collect.button')}
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
                {onShortcuts !== undefined && (
                    <DropdownMenuItem
                        onSelect={onShortcuts}
                        className="hidden lg:flex"
                    >
                        {t('shortcuts.open')}
                        <span className={hint}>?</span>
                    </DropdownMenuItem>
                )}
                <div role="separator" className="my-1 h-px bg-line" />
                {onDuplicate !== undefined && (
                    <DropdownMenuItem onSelect={onDuplicate}>
                        {t('editor.menu_duplicate')}
                    </DropdownMenuItem>
                )}
                {printHref !== undefined && (
                    <DropdownMenuItem asChild className="lg:hidden">
                        <Link href={printHref} className="no-underline">
                            {t('editor.print')}
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild className="lg:hidden">
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
    /** The save status, e.g. "Alleen in deze browser · Inloggen met Google" (B92). */
    saveStatus?: ReactNode;
    /** Open warnings; Controle is the only yellow in the editor (B92, B94). */
    checkCount?: number;
    printHref?: string;
    canUndo?: boolean;
    canRedo?: boolean;
    onOpenPreview?: () => void;
    onToggleCheck?: () => void;
    checkOpen?: boolean;
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
 * the save status with a small undo and redo, then Controle, Voorbeeld and Printen. On a phone: logo, name and
 * Printen; the rest is in the bottom bar.
 */
export function EditorHeader({
    editionName,
    saveStatus,
    checkCount = 0,
    printHref,
    canUndo = false,
    canRedo = false,
    onOpenPreview,
    onToggleCheck,
    checkOpen = false,
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
            <RegistrationStrip className="h-1" />
            {phoneBar !== undefined && (
                <div className="flex h-16 items-center gap-2 px-3 lg:hidden">
                    {phoneBar}
                </div>
            )}
            <div
                className={cn(
                    'h-16 min-w-0 items-center gap-1 px-3 min-[400px]:gap-2 lg:gap-3 lg:px-4',
                    phoneBar === undefined ? 'flex' : 'hidden lg:flex',
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
                    className="hidden min-h-12 flex-none items-center gap-1 px-1 text-sm font-semibold no-underline hover:text-press lg:inline-flex"
                >
                    <ChevronLeftIcon size={16} />
                    {t('editor.back_to_editions')}
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
                        <span className="truncate">{editionName}</span>
                        <ChevronDownIcon size={16} className="flex-none" />
                        {waiting && (
                            <WaitingDot className="absolute top-2 right-0" />
                        )}
                    </Button>
                </NameMenu>

                {saveStatus !== undefined && (
                    <p className="m-0 hidden min-w-0 truncate text-sm text-ink-soft lg:block">
                        {saveStatus}
                    </p>
                )}
                <div className="hidden flex-none items-center gap-1 lg:flex">
                    <Button
                        variant="ghost"
                        className="size-9 px-0"
                        aria-label={t('editor.undo')}
                        {...shortcutProps('undo', t('editor.undo'))}
                        disabled={!canUndo}
                        onClick={onUndo}
                    >
                        <UndoIcon size={18} />
                    </Button>
                    <Button
                        variant="ghost"
                        className="size-9 px-0"
                        aria-label={t('editor.redo')}
                        {...shortcutProps('redo', t('editor.redo'))}
                        disabled={!canRedo}
                        onClick={onRedo}
                    >
                        <RedoIcon size={18} />
                    </Button>
                </div>

                <div className="flex-1" />

                <div className="hidden flex-none items-center gap-3 lg:flex">
                    <Button
                        variant={checkCount > 0 ? 'warning' : 'secondary'}
                        aria-expanded={checkOpen}
                        data-check-toggle
                        {...shortcutProps('check', t('editor.check_title'))}
                        onClick={onToggleCheck}
                    >
                        {checkCount > 0 && <WarningIcon />}
                        {t('editor.check', { count: checkCount })}
                    </Button>
                    {onOpenPreview !== undefined && (
                        <Button
                            variant="secondary"
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
