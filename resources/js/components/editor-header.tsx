import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

import {
    ChevronDownIcon,
    ChevronLeftIcon,
    RedoIcon,
    UndoIcon,
    WarningIcon,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
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
    onToggleCheck,
    checkOpen = false,
    onUndo,
    onRedo,
}: EditorHeaderProps) {
    const { locale } = usePage().props;
    const t = useTranslation();

    return (
        <header className="flex min-h-16 flex-none flex-wrap items-center gap-x-4 gap-y-2 border-b-2 border-ink bg-card px-4 py-2">
            <Link
                href={editionsIndex(locale)}
                aria-label={t('editor.back_to_editions')}
                className="inline-flex min-h-12 items-center gap-1 px-2 font-semibold no-underline hover:text-press"
            >
                <ChevronLeftIcon />
                <span className="hidden md:inline">
                    {t('editor.back_to_editions')}
                </span>
            </Link>

            <Button
                variant="ghost"
                className="font-display text-xl font-extrabold"
                aria-label={t('editor.settings_of', { name: editionName })}
                onClick={onOpenSettings}
            >
                {editionName}
                <ChevronDownIcon size={16} />
            </Button>

            {saveStatus !== undefined && (
                <p className="m-0 hidden text-sm text-ink-soft lg:block">
                    {saveStatus}
                </p>
            )}

            <div className="flex-1" />

            {checkCount > 0 && (
                <Button
                    variant="warning"
                    aria-expanded={checkOpen}
                    onClick={onToggleCheck}
                >
                    <WarningIcon />
                    {t('editor.check', { count: checkCount })}
                </Button>
            )}

            <Button
                variant="icon"
                aria-label={t('editor.undo')}
                disabled={!canUndo}
                onClick={onUndo}
            >
                <UndoIcon />
            </Button>
            <Button
                variant="icon"
                aria-label={t('editor.redo')}
                disabled={!canRedo}
                onClick={onRedo}
            >
                <RedoIcon />
            </Button>

            {printHref !== undefined && (
                <Button asChild>
                    <Link href={printHref}>{t('editor.print')}</Link>
                </Button>
            )}
        </header>
    );
}
