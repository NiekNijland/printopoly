import { Link, usePage } from '@inertiajs/react';

import {
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';
import { shortcutKeys } from '@/features/edition/editor/shortcuts';
import { useKeyboardHints } from '@/hooks/use-media-query';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { index as editionsIndex } from '@/routes/editions';

export /** What the menu under the edition name does (B144): the actions on the whole edition. */
type NameMenuActions = {
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
};

/** An item with one line under it that says what it is for (vindbaarheid point 13). */
const ItemText = ({ title, hint }: { title: string; hint: string }) => {
    return (
        <span className="flex min-w-0 flex-col">
            <span>{title}</span>
            <span className="text-sm font-normal text-ink-soft">{hint}</span>
        </span>
    );
};

const NameMenuShare = ({
    onDuplicate,
    onShare,
    printHref,
    onClearNames,
}: Pick<
    NameMenuActions,
    'onDuplicate' | 'onShare' | 'printHref' | 'onClearNames'
>) => {
    const t = useTranslation();
    const { locale } = usePage().props;

    return (
        <>
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
        </>
    );
};

export const NameMenuItems = ({
    onSettings,
    onCollect,
    collectCount = 0,
    onShortcuts,
    onDuplicate,
    onShare,
    onPreview,
    printHref,
    onClearNames,
}: NameMenuActions) => {
    const t = useTranslation();
    const hint = 'pl-6 font-mono text-xs text-ink-soft';
    const keys = useKeyboardHints();

    return (
        <>
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
                <DropdownMenuItem onSelect={onPreview} className="lg:hidden">
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
            <NameMenuShare
                onDuplicate={onDuplicate}
                onShare={onShare}
                printHref={printHref}
                onClearNames={onClearNames}
            />
        </>
    );
};
