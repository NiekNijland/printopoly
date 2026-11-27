import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

import {
    CheckIcon,
    ChevronLeftIcon,
    MoreIcon,
    RedoIcon,
    UndoIcon,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
    NameMenu,
    WaitingDot,
    type EditorHeaderProps,
} from '@/features/edition/editor/editor-header';
import type { Workspace } from '@/features/edition/editor/workspace/use-workspace';
import { useTranslation } from '@/hooks/use-translation';
import type { EditorTab } from '@/lib/render/editor-catalogue';
import { cn } from '@/lib/utils';
import { redirect as googleRedirect } from '@/routes/auth/google';
import { index as editionsIndex } from '@/routes/editions';
import type { Locale } from '@/types/game';

/** The back arrow names the list it goes back to (R6 Aisha, Sara). */
const BACK_LABEL: Record<EditorTab, string> = {
    board: 'editor.back_to_board',
    cards: 'editor.back_to_cards',
    money: 'editor.back_to_money',
    box: 'editor.back_to_box',
};

export type WorkspaceMenu = NonNullable<EditorHeaderProps['menu']>;

// A tick in front of "Opgeslagen" that people can trust (UX 10, B92); while saving only the word.
const SaveStatusLine = ({
    saved,
    message,
    login,
}: {
    saved: boolean;
    message: ReactNode;
    login: string | null;
}) => (
    <>
        {saved && (
            <CheckIcon
                size={16}
                data-saved
                className="mr-1 inline-block -translate-y-px align-middle text-ink"
            />
        )}
        {message}
        {login !== null && (
            <>
                {' · '}
                <a href={googleRedirect().url} className="font-semibold">
                    {login}
                </a>
            </>
        )}
    </>
);

type PhoneBarProps = {
    label: string;
    subtitle: string;
    editionName: string;
    editionOpen: boolean;
    customized: boolean;
    tab: EditorTab;
    menu: WorkspaceMenu;
    printHref: string;
    element: { title: string; items: ReactNode } | undefined;
    dialogs: ReactNode;
    waiting: number;
    onBack: () => void;
};

const PhoneSubtitle = ({
    editionOpen,
    customized,
    subtitle,
    editionName,
}: Pick<
    PhoneBarProps,
    'editionOpen' | 'customized' | 'subtitle' | 'editionName'
>) => {
    const t = useTranslation();

    return (
        <p className="m-0 flex min-w-0 items-center gap-2 text-sm text-ink-soft">
            {editionOpen ? (
                <span className="truncate">{t('edition_panel.applies')}</span>
            ) : customized ? (
                // Like the panel head on a desktop (§3.3): the kind, then a dot when the element changed.
                <>
                    <span className="truncate">{subtitle}</span>
                    <span
                        aria-hidden="true"
                        className="size-2 flex-none rounded-full bg-ink"
                    />
                    <span className="flex-none">{t('editor.customized')}</span>
                </>
            ) : (
                <span className="truncate">{`${subtitle} · ${editionName}`}</span>
            )}
        </p>
    );
};

// Phone, on an element or the edition: one top bar with one back arrow, the name and the menu (§3.6).
export const PhoneBar = (props: PhoneBarProps) => {
    const t = useTranslation();
    const { label, editionName, editionOpen, element, waiting } = props;

    return (
        <>
            <Button
                variant="icon"
                aria-label={t(
                    editionOpen ? 'editor.back_to_list' : BACK_LABEL[props.tab],
                )}
                onClick={props.onBack}
            >
                <ChevronLeftIcon />
            </Button>
            <div className="min-w-0 flex-1">
                <p
                    tabIndex={-1}
                    data-phone-title
                    className="m-0 line-clamp-2 font-display text-lg leading-tight font-extrabold break-words outline-none"
                >
                    {label}
                </p>
                <PhoneSubtitle {...props} />
            </div>
            <NameMenu
                editionName={editionName}
                {...props.menu}
                printHref={props.printHref}
                element={element}
            >
                <Button
                    variant="icon"
                    className="relative"
                    aria-label={
                        element === undefined
                            ? t('editor.name_menu', { name: editionName })
                            : t('editor.element_name_menu', {
                                  element: element.title,
                                  name: editionName,
                              })
                    }
                >
                    <MoreIcon />
                    {waiting > 0 && (
                        <WaitingDot className="absolute top-1.5 right-1.5" />
                    )}
                </Button>
            </NameMenu>
            {!editionOpen && props.dialogs}
        </>
    );
};

const ALERT =
    'absolute inset-x-0 top-0 z-40 m-0 border-b-2 border-ink bg-warning px-4 py-3 text-sm';

export const WorkspaceAlerts = ({
    deletedElsewhere,
    problem,
    duplicateFailed,
    locale,
}: {
    deletedElsewhere: boolean;
    problem: string | null;
    duplicateFailed: boolean;
    locale: Locale;
}) => {
    const t = useTranslation();

    return (
        <>
            {deletedElsewhere && (
                <p role="alert" className={ALERT}>
                    {t('editor.deleted_elsewhere')}{' '}
                    <Link
                        href={editionsIndex(locale)}
                        className="font-semibold"
                    >
                        {t('editor.back_to_editions')}
                    </Link>
                </p>
            )}
            {(problem !== null || duplicateFailed) && (
                <p role="alert" className={ALERT}>
                    {problem !== null
                        ? t(`editor.sync_${problem}`)
                        : t('editor.menu_duplicate_failed')}
                </p>
            )}
        </>
    );
};

type PhoneActionsProps = {
    onElement: boolean;
    canUndo: boolean;
    canRedo: boolean;
    onStep: (direction: 1 | -1) => void;
    onUndo: () => void;
    onRedo: () => void;
    onPreview: () => void;
};

// Phone: the actions sit at the bottom (Mobiel-bord, Editor-mobiel, B138 §3.6).
export const PhoneActions = ({
    onElement,
    canUndo,
    canRedo,
    onStep,
    onUndo,
    onRedo,
    onPreview,
}: PhoneActionsProps) => {
    const t = useTranslation();

    return (
        <nav
            aria-label={t('editor.actions')}
            className="flex flex-none items-center gap-1.5 border-t-2 border-ink bg-card p-2 pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] min-[380px]:gap-2 md:hidden phone-low:col-span-2 phone-low:py-1"
        >
            {onElement && (
                <Button
                    variant="icon"
                    aria-label={t('editor.previous')}
                    onClick={() => onStep(-1)}
                >
                    <ChevronLeftIcon />
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
            {onElement ? (
                <Button
                    variant="icon"
                    aria-label={t('editor.next')}
                    onClick={() => onStep(1)}
                >
                    <ChevronLeftIcon className="rotate-180" />
                </Button>
            ) : (
                <Button
                    variant="secondary"
                    className="min-w-0 flex-1 px-2 min-[380px]:px-4"
                    data-preview-toggle
                    onClick={onPreview}
                >
                    {t('editor.preview_button')}
                </Button>
            )}
        </nav>
    );
};

export const FlashNote = ({ flash }: { flash: string | null }) => (
    <p
        role="status"
        className={cn(
            'pointer-events-none fixed bottom-24 left-1/2 z-50 m-0 -translate-x-1/2 rounded-control border-2 border-ink bg-ink px-4 py-2 text-sm font-semibold text-paper transition-opacity motion-reduce:transition-none md:bottom-6',
            flash !== null ? 'opacity-100' : 'opacity-0',
        )}
    >
        {flash ?? ''}
    </p>
);

export const WorkspaceSaveStatus = ({ ws }: { ws: Workspace }) => {
    const { save, auth } = ws.data;
    const kind = save.status.kind;

    return (
        <SaveStatusLine
            saved={
                kind === 'saved-local' ||
                kind === 'saved-account' ||
                kind === 'safari-eviction'
            }
            message={save.text.message}
            login={
                save.text.actionLabel !== null &&
                auth.user === null &&
                auth.googleLoginEnabled
                    ? save.text.actionLabel
                    : null
            }
        />
    );
};
