import type { ReactNode } from 'react';

import { ChevronDownIcon, ZoomIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BoardNavigator } from '@/features/edition/editor/board-navigator';
import { EditionRow, FriendsRow } from '@/features/edition/editor/edition-row';
import type { WorkspaceParts } from '@/features/edition/editor/workspace/use-workspace-commands';
import type { BoardFold } from '@/features/edition/editor/workspace/use-workspace-state';
import { WorkspaceSaveStatus } from '@/features/edition/editor/workspace/workspace-chrome';
import { WorkspaceList } from '@/features/edition/editor/workspace/workspace-list';
import { useTranslation } from '@/hooks/use-translation';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';
import { EDITOR_TABS, type EditorTab } from '@/lib/render/editor-catalogue';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { cn } from '@/lib/utils';
import type { Locale } from '@/types/game';

export const TAB_LABEL: Record<EditorTab, string> = {
    board: 'editor.tab_board',
    cards: 'editor.tab_cards',
    money: 'editor.tab_money',
    box: 'editor.tab_box',
};

const PartTabs = ({
    value,
    onOpen,
}: {
    value: string;
    onOpen: (id: EditorTab) => void;
}) => {
    const t = useTranslation();

    return (
        <Tabs
            value={value}
            onValueChange={(next) => {
                const id = EDITOR_TABS.find((item) => item === next);
                if (id !== undefined) {
                    onOpen(id);
                }
            }}
            activationMode="manual"
            className="low:min-w-0 low:flex-1"
        >
            <TabsList
                variant="segmented"
                aria-label={t('editor.part')}
                className="w-full"
            >
                {EDITOR_TABS.map((id, index) => (
                    <TabsTrigger
                        key={id}
                        value={id}
                        title={`${t(TAB_LABEL[id])} (${index + 1})`}
                        aria-keyshortcuts={`${index + 1} Alt+${index + 1}`}
                        // Radix chooses on mouse down; a click also counts, for a tab that is already
                        // chosen (back to its first element) and for voice control and screen readers.
                        onClick={() => onOpen(id)}
                        className="h-auto min-h-12 min-w-0 border-l-2 border-ink px-0.5 py-1 leading-tight first:border-l-0 min-[360px]:px-0.5 min-[360px]:text-sm"
                    >
                        <span className="max-w-full truncate">
                            {t(TAB_LABEL[id])}
                        </span>
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
};

type MiniBoardProps = {
    edition: Edition;
    locale: Locale;
    selected: string;
    warned: ReadonlySet<string>;
    photos: PhotoInfos;
    onPick: (key: string) => void;
    onMove: (key: string | undefined) => void;
    onSwap: (from: string, to: string) => void;
    onOpenBig: () => void;
    fold: BoardFold;
};

// On a low screen the list is the way to a space; the board would push it out of sight.
// Lower than 900 px it starts folded to one line (vindbaarheid point 16).
const MiniBoard = (props: MiniBoardProps) => {
    const t = useTranslation();
    const { shortScreen, shown: boardShown, onShownChange } = props.fold;

    return (
        <Collapsible
            open={boardShown}
            onOpenChange={onShownChange}
            className="flex flex-col items-center gap-2 lg:items-start low:hidden"
        >
            <CollapsibleTrigger asChild>
                <button
                    type="button"
                    data-board-fold
                    className={cn(
                        'hidden min-h-11 w-full cursor-pointer items-center gap-2 rounded-control border-2 border-ink bg-card px-3 text-left text-sm font-semibold text-ink hover:bg-paper',
                        (shortScreen || !boardShown) && 'md:flex',
                    )}
                >
                    <ChevronDownIcon
                        size={16}
                        aria-hidden="true"
                        className={cn('flex-none', boardShown && 'rotate-180')}
                    />
                    {boardShown
                        ? t('editor.board_fold')
                        : t('editor.board_show')}
                </button>
            </CollapsibleTrigger>
            <CollapsibleContent
                forceMount
                className={cn(
                    'w-full flex-col items-center gap-2 lg:items-start',
                    boardShown ? 'flex' : 'flex md:hidden',
                )}
            >
                {/* Phone: small and not sticky, so the list is the main route; a tap on it opens
                    the big board to pick from (UX 2, ronde 3). */}
                <div
                    className="relative w-full max-lg:aspect-square max-lg:w-[min(100%,33dvh)] max-lg:overflow-hidden"
                    data-mini-board="compact"
                >
                    <BoardNavigator
                        edition={props.edition}
                        interfaceLanguage={props.locale}
                        selected={props.selected}
                        onSelect={props.onPick}
                        onMove={props.onMove}
                        warned={props.warned}
                        onSwap={props.onSwap}
                        photos={props.photos}
                    />
                    <button
                        type="button"
                        data-board-open
                        tabIndex={-1}
                        aria-label={t('editor.board_pick')}
                        onClick={props.onOpenBig}
                        className="absolute inset-0 z-20 cursor-pointer border-0 bg-transparent lg:hidden"
                    />
                </div>
                {/* Off the board, so it never covers a space (bug 11). */}
                <Button
                    variant="secondary"
                    data-big-board-open
                    className="max-lg:w-[min(100%,33dvh)]"
                    onClick={props.onOpenBig}
                >
                    <ZoomIcon size={18} />
                    {t('editor.board_zoom_in')}
                </Button>
            </CollapsibleContent>
        </Collapsible>
    );
};

type NavHeadProps = {
    saveStatus: ReactNode;
    resolved: ResolvedEdition;
    locale: Locale;
    editionOpen: boolean;
    tab: EditorTab;
    waiting: number;
    board: MiniBoardProps;
    onOpenEdition: () => void;
    onOpenTab: (id: EditorTab) => void;
    onOpenFriends: () => void;
};

const NavHead = (props: NavHeadProps) => (
    // A low screen (a phone or tablet on its side) puts Editie, as its stamp, beside the tabs, so the list keeps
    // most of the height (designcheck ronde 5).
    <div
        data-nav-head
        className="flex flex-none flex-col gap-3 p-4 pb-3 low:flex-row low:flex-wrap low:items-center low:gap-2 low:px-3 low:py-2"
    >
        <p className="m-0 text-sm text-ink-soft xl:hidden low:hidden">
            {props.saveStatus}
        </p>
        <EditionRow
            resolved={props.resolved}
            interfaceLanguage={props.locale}
            selected={props.editionOpen}
            onSelect={props.onOpenEdition}
        />
        <PartTabs
            value={props.editionOpen ? '' : props.tab}
            onOpen={props.onOpenTab}
        />
        {props.waiting > 0 && (
            <FriendsRow count={props.waiting} onOpen={props.onOpenFriends} />
        )}
        {props.tab === 'board' && <MiniBoard {...props.board} />}
    </div>
);

export const NavColumn = ({ ws, commands }: WorkspaceParts) => {
    const { data, navigation, view, session } = ws;
    const { editionOpen } = navigation;
    const selected = editionOpen ? '' : view.key;
    const t = useTranslation();

    return (
        <nav
            aria-label={t('editor.parts_nav')}
            className={cn(
                'min-h-0 flex-col border-ink md:row-span-2 md:flex md:overflow-clip md:border-r-2 lg:row-span-1 tablet-low:row-span-1',
                navigation.mobileElement
                    ? 'hidden'
                    : 'flex flex-1 overflow-auto',
            )}
        >
            <NavHead
                saveStatus={<WorkspaceSaveStatus ws={ws} />}
                resolved={data.resolved}
                locale={data.locale}
                editionOpen={editionOpen}
                tab={view.tab}
                waiting={data.contributions.length}
                onOpenEdition={() => commands.openEdition()}
                onOpenTab={commands.openTab}
                onOpenFriends={commands.openFriends}
                board={{
                    edition: data.edition,
                    locale: data.locale,
                    selected,
                    warned: data.warned,
                    photos: data.photos,
                    onPick: commands.pickSpace,
                    onMove: commands.goTo,
                    onSwap: commands.swapSpaces,
                    onOpenBig: () =>
                        ws.navigate({ type: 'big-board', open: true }),
                    fold: ws.boardFold,
                }}
            />
            <WorkspaceList
                tab={view.tab}
                edition={data.edition}
                session={session}
                locale={data.locale}
                selected={selected}
                warned={data.warned}
                photos={data.photos}
                inSet={data.inSet}
                query={ws.query}
                upload={ws.listUpload}
                onQuery={(next) =>
                    ws.setQueries((all) => ({ ...all, [view.tab]: next }))
                }
                onPasteLines={commands.pasteInSearch}
                onSelect={commands.select}
                onFocusRow={commands.goTo}
                onAnnounce={(text) => ws.showFlash(text, 3000)}
                onSwapPhoto={commands.swapPhotos}
            />
        </nav>
    );
};
