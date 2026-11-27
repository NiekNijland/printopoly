import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

import { LogoMark } from '@/components/logo';
import { RegistrationStrip } from '@/components/registration-strip';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ChevronDownIcon,
    ChevronLeftIcon,
    RedoIcon,
    UndoIcon,
} from '@/components/ui/icons';
import {
    NameMenuItems,
    type NameMenuActions,
} from '@/features/edition/editor/name-menu-items';
import { shortcutProps } from '@/features/edition/editor/shortcuts';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { index as editionsIndex } from '@/routes/editions';

type NameMenuProps = {
    editionName: string;
    /**
     * On a phone, on an element: the element's own actions (Terug naar standaard, Wisselen met…, Kaart weghalen) on
     * top of the menu, so the top bar has one menu (B151).
     */
    element?: { title: string; items: ReactNode };
    /** The button that opens the menu. */
    children: ReactNode;
} & NameMenuActions;

/** The small red dot that says friends sent something (B146). */
export const WaitingDot = ({ className }: { className?: string }) => {
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
};

/** A small heading above a group of items, for the phone's menu with two groups (B151). */
const MenuGroupLabel = ({ children }: { children: ReactNode }) => {
    return (
        <DropdownMenuLabel className="truncate px-3 pt-2 pb-1 font-mono text-xs font-normal text-ink-soft">
            {children}
        </DropdownMenuLabel>
    );
};

/**
 * The name menu (B144): Editie-instellingen, Samen maken with what waits, Sneltoetsen, Deel je bord (B202) and
 * Dupliceren. The same
 * menu at every width; a phone adds Voorbeeld and the way back to Mijn edities, and on an element puts that
 * element's actions on top (B151).
 */
export const NameMenu = ({
    editionName,
    element,
    children,
    ...actions
}: NameMenuProps) => {
    const t = useTranslation();

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
                <NameMenuItems {...actions} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export type EditorHeaderProps = {
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
};

const HeaderNameMenu = ({
    editionName,
    menu,
}: {
    editionName: string;
    menu: NameMenuActions;
}) => {
    const t = useTranslation();
    const waiting = (menu.collectCount ?? 0) > 0;

    return (
        <NameMenu editionName={editionName} {...menu}>
            <Button
                variant="ghost"
                className="relative min-w-0 shrink gap-1 px-2 font-display text-lg font-extrabold lg:max-w-72 lg:text-xl"
                aria-label={t(
                    waiting ? 'editor.name_menu_waiting' : 'editor.name_menu',
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
                            : editionName.length > 22 && 'text-base lg:text-lg',
                    )}
                >
                    {editionName}
                </span>
                <ChevronDownIcon size={16} className="flex-none" />
                {waiting && <WaitingDot className="absolute top-2 right-0" />}
            </Button>
        </NameMenu>
    );
};

const UndoRedo = ({
    canUndo,
    canRedo,
    onUndo,
    onRedo,
}: Required<Pick<EditorHeaderProps, 'canUndo' | 'canRedo'>> &
    Pick<EditorHeaderProps, 'onUndo' | 'onRedo'>) => {
    const t = useTranslation();

    return (
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
    );
};

const HeaderActions = ({
    onOpenPreview,
    printHref,
}: Pick<EditorHeaderProps, 'onOpenPreview' | 'printHref'>) => {
    const t = useTranslation();

    return (
        <>
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
        </>
    );
};

/**
 * The editor header on one line of 64 px (B144): logo, back to Mijn edities, the edition name with its menu,
 * the save status with a small undo and redo, then Voorbeeld and Printen. No Controle and no counter: messages stay
 * at their element and come together before printing (B197). On a phone: logo, name and Printen; the rest is in
 * the bottom bar.
 */
export const EditorHeader = ({
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
}: EditorHeaderProps) => {
    const { locale } = usePage().props;
    const t = useTranslation();

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

                <HeaderNameMenu editionName={editionName} menu={menu} />

                {saveStatus !== undefined && (
                    <p className="m-0 hidden min-w-0 truncate text-sm text-ink-soft xl:block">
                        {saveStatus}
                    </p>
                )}
                <UndoRedo
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={onUndo}
                    onRedo={onRedo}
                />

                <div className="flex-1" />

                <HeaderActions
                    onOpenPreview={onOpenPreview}
                    printHref={printHref}
                />
            </div>
        </header>
    );
};
