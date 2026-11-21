import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

import {
    ChevronDownIcon,
    ChevronLeftIcon,
    KeyboardIcon,
    MoreIcon,
    RedoIcon,
    UndoIcon,
    UsersIcon,
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
import { shortcutProps } from '@/lib/editor/shortcuts';
import { home } from '@/routes';
import { index as editionsIndex } from '@/routes/editions';

export interface EditorHeaderProps {
    editionName: string;
    /** The save status, e.g. "Alleen in deze browser · Inloggen met Google" (B92). */
    saveStatus?: ReactNode;
    /** Open warnings; Controle is the only yellow in the editor (B92, B94). */
    checkCount?: number;
    printHref?: string;
    canUndo?: boolean;
    canRedo?: boolean;
    onOpenSettings?: () => void;
    onOpenShortcuts?: () => void;
    onOpenPreview?: () => void;
    /** "Samen maken" (B123): opens the dialog; the badge counts what waits for a decision. */
    onOpenCollect?: () => void;
    collectCount?: number;
    onToggleCheck?: () => void;
    checkOpen?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
}

/**
 * The compact editor header (B91), as in docs/design/Editor.dc.html: back to
 * Mijn edities, the edition name (opens the settings), the save status,
 * Controle, undo, redo and Printen.
 */
export function EditorHeader({
    editionName,
    saveStatus,
    checkCount = 0,
    printHref,
    canUndo = false,
    canRedo = false,
    onOpenSettings,
    onOpenShortcuts,
    onOpenPreview,
    onOpenCollect,
    collectCount = 0,
    onToggleCheck,
    checkOpen = false,
    onUndo,
    onRedo,
}: EditorHeaderProps) {
    const { locale } = usePage().props;
    const t = useTranslation();

    return (
        <header className="flex-none border-b-2 border-ink bg-card">
            <RegistrationStrip className="h-1" />
            <div className="flex min-h-16 items-center gap-x-1 gap-y-2 px-3 py-2 min-[400px]:gap-x-2 lg:flex-wrap lg:gap-x-4 lg:px-4">
                <Link
                    href={home(locale)}
                    aria-label="Printopoly"
                    className="inline-flex size-12 items-center justify-center no-underline"
                >
                    <LogoMark size={32} />
                </Link>
                <Link
                    href={editionsIndex(locale)}
                    aria-label={t('editor.back_to_editions')}
                    className="inline-flex min-h-12 min-w-12 items-center justify-center gap-1 px-2 font-semibold no-underline hover:text-press"
                >
                    <ChevronLeftIcon />
                    <span className="hidden lg:inline">
                        {t('editor.back_to_editions')}
                    </span>
                </Link>

                <Button
                    variant="ghost"
                    className="min-w-0 shrink px-2 font-display text-lg font-extrabold lg:px-3 lg:text-xl"
                    aria-label={t('editor.settings_of', { name: editionName })}
                    onClick={onOpenSettings}
                >
                    <span className="truncate">{editionName}</span>
                    <ChevronDownIcon size={16} className="flex-none" />
                </Button>

                {saveStatus !== undefined && (
                    <p className="m-0 hidden text-sm text-ink-soft lg:block">
                        {saveStatus}
                    </p>
                )}

                <div className="flex-1" />

                {/* Phone: what the wide header shows as buttons sits in one menu. */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="icon"
                            className="relative lg:hidden"
                            aria-label={t('editor.more')}
                        >
                            <MoreIcon />
                            {collectCount > 0 && (
                                <span
                                    aria-hidden="true"
                                    className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-press"
                                />
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-56 lg:hidden">
                        {onOpenPreview !== undefined && (
                            <DropdownMenuItem onSelect={onOpenPreview}>
                                {t('editor.preview_button')}
                            </DropdownMenuItem>
                        )}
                        {onOpenCollect !== undefined && (
                            <DropdownMenuItem onSelect={onOpenCollect}>
                                {t('collect.button')}
                                {collectCount > 0 && (
                                    <span className="ml-2 rounded-full bg-press px-2 text-sm text-white">
                                        {collectCount}
                                    </span>
                                )}
                            </DropdownMenuItem>
                        )}
                        {printHref !== undefined && (
                            <DropdownMenuItem asChild>
                                <Link href={printHref} className="no-underline">
                                    {t('editor.print')}
                                </Link>
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="hidden items-center gap-4 lg:flex">
                    {onOpenCollect !== undefined && (
                        <Button
                            variant="secondary"
                            data-collect-toggle
                            aria-label={
                                collectCount > 0
                                    ? t('collect.button_new', {
                                          count: collectCount,
                                      })
                                    : undefined
                            }
                            onClick={onOpenCollect}
                        >
                            <UsersIcon />
                            {t('collect.button')}
                            {collectCount > 0 && (
                                <span
                                    aria-hidden="true"
                                    className="rounded-full bg-press px-2 text-sm text-white"
                                >
                                    {collectCount}
                                </span>
                            )}
                        </Button>
                    )}

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

                    <Button
                        variant="icon"
                        aria-label={t('editor.undo')}
                        {...shortcutProps('undo', t('editor.undo'))}
                        disabled={!canUndo}
                        onClick={onUndo}
                    >
                        <UndoIcon />
                    </Button>
                    <Button
                        variant="icon"
                        aria-label={t('editor.redo')}
                        {...shortcutProps('redo', t('editor.redo'))}
                        disabled={!canRedo}
                        onClick={onRedo}
                    >
                        <RedoIcon />
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

                    {onOpenShortcuts !== undefined && (
                        <Button
                            variant="icon"
                            aria-label={t('shortcuts.open')}
                            {...shortcutProps('help', t('shortcuts.open'))}
                            onClick={onOpenShortcuts}
                        >
                            <KeyboardIcon />
                        </Button>
                    )}

                    {printHref !== undefined && (
                        <Button asChild>
                            <Link
                                href={printHref}
                                {...shortcutProps('print', t('editor.print'))}
                            >
                                {t('editor.print')}
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
