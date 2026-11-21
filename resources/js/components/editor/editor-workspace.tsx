import { Link, router, usePage } from '@inertiajs/react';
import {
    useEffect,
    useRef,
    useMemo,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from 'react';

import { BoardList, BoardNavigator } from '@/components/editor/board-navigator';
import { CheckPanel } from '@/components/editor/check-panel';
import { useChecks } from '@/components/editor/check-probe';
import { CollectCard } from '@/components/editor/collect-card';
import { CollectDialog } from '@/components/editor/collect-dialog';
import { ConflictDialog } from '@/components/editor/conflict-dialog';
import { ElementList } from '@/components/editor/element-list';
import { ElementPanel, kindLine } from '@/components/editor/element-panel';
import {
    ElementPreview,
    previewSize,
} from '@/components/editor/element-preview';
import { ElementStage } from '@/components/editor/element-stage';
import { LayerOverlay } from '@/components/editor/layer-overlay';
import { PanelMenu } from '@/components/editor/panel/panel-header';
import { PreviewDialog } from '@/components/editor/preview-dialog';
import { SettingsDialog } from '@/components/editor/settings-dialog';
import { ShortcutsDialog } from '@/components/editor/shortcuts-dialog';
import { WordsDialog } from '@/components/editor/words-dialog';
import {
    ChevronLeftIcon,
    RedoIcon,
    UndoIcon,
    WarningIcon,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
    SegmentedTabs,
    SegmentedTabsList,
    SegmentedTabsTrigger,
} from '@/components/ui/segmented-tabs';
import { useCollectionBox } from '@/hooks/use-collection-box';
import { useContributionDecision } from '@/hooks/use-contribution-decision';
import { useSaveStatus, useSessionSnapshot } from '@/hooks/use-edition-session';
import { useServices } from '@/hooks/use-editions';
import { useEditorShortcuts } from '@/hooks/use-editor-shortcuts';
import { useRemotePush } from '@/hooks/use-remote-push';
import { useTranslation } from '@/hooks/use-translation';
import EditorLayout from '@/layouts/editor-layout';
import {
    ALLOWED_FIELDS,
    cardBackKey,
    cardKey,
    parseKey,
    spaceKey,
} from '@/lib/edition/keys';
import { usedPhotoIds } from '@/lib/edition/repository';
import { resolveEdition } from '@/lib/edition/resolve';
import type { EditionSession } from '@/lib/edition/session';
import {
    BOARD_ORDER,
    deedKeyForSpace,
    elementLabel,
    firstKey,
    spacePosition,
    stepKey,
    tabCounts,
    tabKeys,
    tabOfKey,
    visibleTabs,
    type EditorTab,
} from '@/lib/editor/catalogue';
import { readProbe } from '@/lib/editor/checks-input';
import { editElement } from '@/lib/editor/edit';
import { centerZones, replaceLayer } from '@/lib/editor/layers';
import { lookupResolved } from '@/lib/editor/lookup';
import { photoBleed } from '@/lib/editor/photo-bleed';
import { PhotoCache } from '@/lib/editor/photo-cache';
import {
    actOnPlacement,
    type PlacementAction,
    type PlacementContext,
} from '@/lib/editor/placements';
import { readPlainEnabled, writePlainEnabled } from '@/lib/editor/shortcuts';
import { swapChanges } from '@/lib/editor/swap';
import { deedsFor } from '@/lib/game/standard-edition';
import type { Size } from '@/lib/print/types';
import { cn } from '@/lib/utils';
import { redirect as googleRedirect } from '@/routes/auth/google';
import {
    index as editionsIndex,
    print as editionsPrint,
} from '@/routes/editions';

const TAB_LABEL: Record<EditorTab, string> = {
    board: 'editor.tab_board',
    cards: 'editor.tab_cards',
    money: 'editor.tab_money',
    box: 'editor.tab_box',
    style: 'editor.tab_style',
};

function sameSize(a: Size | null, b: Size | null): boolean {
    return a === b || (a !== null && b !== null && a.w === b.w && a.h === b.h);
}

interface EditorWorkspaceProps {
    session: EditionSession;
}

/**
 * The editor (B73, B93): tabs per part, the board as navigator, the chosen element large in the
 * middle, and its fields on the right. On a phone the overview and the element are two screens.
 */
function isTextTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return (
        target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    );
}

export function EditorWorkspace({ session }: EditorWorkspaceProps) {
    const t = useTranslation();
    const { locale, auth } = usePage().props;
    const { repository } = useServices();
    const { edition, canUndo, canRedo, conflict, deletedElsewhere } =
        useSessionSnapshot(session);
    const push = useRemotePush(session);
    const collect = useCollectionBox(edition, auth.user !== null);
    const waiting = collect.box?.contributions.length ?? 0;
    const [cache] = useState(
        () => new PhotoCache((id) => repository.getPhoto(id)),
    );
    const decision = useContributionDecision({
        collect,
        session,
        repository,
        locale,
        onPhoto: (record) => cache.add(record),
    });
    const { text: saveText } = useSaveStatus(session, {
        loggedIn: push.loggedIn,
        pendingSync: push.pending,
        syncedAt: push.syncedAt,
    });

    const [selectedKey, setSelectedKey] = useState('space.01');
    const [deedView, setDeedView] = useState(false);
    const [checkOpen, setCheckOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [wordsOpen, setWordsOpen] = useState(false);
    const [collectOpen, setCollectOpen] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [plainShortcuts, setPlainShortcuts] = useState(readPlainEnabled);
    const [savedFlash, setSavedFlash] = useState(false);
    const [mobileElement, setMobileElement] = useState(false);
    const [announcement, setAnnouncement] = useState('');
    const [measured, setMeasured] = useState<Size | null>(null);
    const [layerSel, setLayerSel] = useState<{
        key: string;
        id: string | null;
    }>({ key: '', id: null });

    const resolved = useMemo(() => resolveEdition(edition), [edition]);
    const photos = useSyncExternalStore(cache.subscribe, cache.getSnapshot);
    const photoIds = [...usedPhotoIds(edition.elements)].sort().join(',');

    useEffect(() => {
        cache.request(photoIds === '' ? [] : photoIds.split(','));
    }, [cache, photoIds]);
    useEffect(() => () => cache.dispose(), [cache]);

    const { issues, probe } = useChecks(edition, photos);

    // Warnings per element; a deed's warning also marks its space on the board.
    const warned = useMemo(() => {
        const keys = new Set<string>();
        for (const issue of issues) {
            keys.add(issue.elementKey);
            if (parseKey(issue.elementKey)?.kind === 'deed') {
                const index = Number(issue.elementKey.split('.')[1]);
                resolved.deeds
                    ?.filter((deed) => deed.index === index)
                    .forEach((deed) => keys.add(spaceKey(deed.space.position)));
            }
        }

        return keys;
    }, [issues, resolved]);

    // A key that is no longer in a visible part (switched off in the settings) falls back to the board.
    const tabs = visibleTabs(edition.parts);
    const activeTab = tabOfKey(selectedKey);
    const valid =
        tabs.includes(activeTab) &&
        tabKeys(activeTab, edition.parts, edition.elements).includes(
            selectedKey,
        );
    const key = valid ? selectedKey : 'space.01';
    const tab = tabOfKey(key);
    const position = spacePosition(key);
    const deedKey =
        position === undefined || !edition.parts.deeds
            ? undefined
            : deedKeyForSpace(position);
    const showDeed = deedView && deedKey !== undefined;
    const editKey = showDeed ? deedKey : key;
    const target = { key, deed: showDeed };
    const editKind = parseKey(editKey)?.kind;
    const hasLayers =
        editKind !== undefined && ALLOWED_FIELDS[editKind].includes('layers');
    const layerId = layerSel.key === editKey ? layerSel.id : null;
    const layers = edition.elements[editKey]?.layers ?? [];

    const part = lookupResolved(resolved, editKey);
    const photo = part?.photo;
    const size = previewSize(target, edition);

    const info = photo === undefined ? undefined : photos.get(photo.photoId);
    const frame = measured === null ? null : { w: measured.w, h: measured.h };
    const context: PlacementContext | null =
        info !== undefined && frame !== null
            ? {
                  source: { w: info.width, h: info.height },
                  frame,
                  bleed: photoBleed(editKey, part?.photoStyle),
              }
            : null;

    const [focusRequest, setFocusRequest] = useState<{
        n: number;
        field: string;
    } | null>(null);

    // Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl+Y outside text fields; inside them the browser keeps its own undo.
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (
                event.defaultPrevented ||
                event.altKey ||
                !(event.ctrlKey || event.metaKey) ||
                isTextTarget(event.target)
            ) {
                return;
            }
            const letter = event.key.toLowerCase();
            if (letter === 'z') {
                event.preventDefault();
                if (event.shiftKey) {
                    session.redo();
                } else {
                    session.undo();
                }
            } else if (letter === 'y' && event.ctrlKey && !event.shiftKey) {
                event.preventDefault();
                session.redo();
            }
        };
        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, [session]);

    // After a row of the Controle list: focus goes to the field it is about, else the focus view.
    useEffect(() => {
        if (focusRequest === null) {
            return;
        }
        const pick = (selector: string) =>
            document.querySelector<HTMLElement>(selector);
        const target =
            pick(`[data-field="${focusRequest.field}"]`) ??
            pick('[data-focus-view]') ??
            pick('[data-field]') ??
            pick('[data-preview]');
        target?.focus();
    }, [focusRequest]);

    const openFromCheck = (next: string, field: string): void => {
        if (parseKey(next)?.kind === 'words') {
            setCheckOpen(false);
            setWordsOpen(true);

            return;
        }
        select(next);
        setFocusRequest((previous) => ({
            n: (previous?.n ?? 0) + 1,
            field: field.startsWith('layer') ? 'photo' : field,
        }));
    };

    const select = (next: string): void => {
        setSelectedKey(next);
        setDeedView(false);
        setCheckOpen(false);
        setMobileElement(true);
    };

    const act = (action: PlacementAction, text?: string): void => {
        if (photo === undefined || context === null) {
            return;
        }
        editElement(
            session,
            editKey,
            { photo: actOnPlacement(photo, context, action) },
            `photo:${editKey}`,
        );
        if (text !== undefined) {
            setAnnouncement(text);
        }
    };

    const zoomText = (scale: number): string =>
        t('editor.zoom_announce', { percent: Math.round(scale * 100) });

    const tabKeyList = tabKeys(tab, edition.parts, edition.elements);
    const siblings = tabKeyList.slice(tabKeyList.indexOf(key) + 1);
    const neighbours = (step: 1 | -1) =>
        stepKey(tab === 'board' ? BOARD_ORDER : tabKeyList, key, step);

    const label = elementLabel(key, edition, locale);
    const subtitle = kindLine(key, edition, resolved, t, locale);
    const printHref = editionsPrint({ locale, edition: edition.id }).url;

    const editLabel = elementLabel(editKey, edition, locale);

    // After a pawn or an extra card left the set: the same place when a later card moved up, else the one before.
    const leaveRemoved = (): void => {
        const { parts, elements } = session.edition;
        const list = tabKeys(tab, parts, elements);
        const before = Math.max(0, tabKeyList.indexOf(key) - 1);
        setSelectedKey(
            list.includes(key)
                ? key
                : (list[before] ??
                      firstKey(tab, parts, elements) ??
                      'space.01'),
        );
        setDeedView(false);
    };

    const flashTimer = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(flashTimer.current), []);

    const focusField = (selector: string): boolean => {
        const node = document.querySelector<HTMLElement>(selector);
        if (node === null) {
            return false;
        }
        node.focus();
        if (node instanceof HTMLInputElement) {
            node.select();
        }

        return true;
    };

    const step = (direction: 1 | -1): void => {
        const next = neighbours(direction);
        if (next !== undefined) {
            setSelectedKey(next);
            setDeedView(false);
        }
    };

    const toggleCheck = (): void => setCheckOpen((open) => !open);

    useEditorShortcuts(
        {
            next: () => step(1),
            previous: () => step(-1),
            tab: (index) => {
                const id = tabs[index];
                const first =
                    id === undefined
                        ? undefined
                        : firstKey(id, edition.parts, edition.elements);
                if (first !== undefined) {
                    setSelectedKey(first);
                    setDeedView(false);
                }
            },
            check: toggleCheck,
            focusName: () => {
                const found =
                    focusField('[data-field="name"]') ||
                    focusField('[data-field="text"]');
                if (!found) {
                    focusField('[data-field]:not([data-field="photo"])');
                }
            },
            photo: () => {
                document
                    .querySelector<HTMLElement>('[data-field="photo"]')
                    ?.click();
            },
            rotate: () => act({ type: 'rotate', turns: 1 }),
            grayscale: () =>
                photo !== undefined &&
                act({ type: 'grayscale', on: !photo.grayscale }),
            zoomIn: () =>
                photo !== undefined &&
                act(
                    { type: 'zoom-by', delta: 0.1 },
                    zoomText(Math.min(3, photo.scale + 0.1)),
                ),
            zoomOut: () =>
                photo !== undefined &&
                act(
                    { type: 'zoom-by', delta: -0.1 },
                    zoomText(Math.max(1, photo.scale - 0.1)),
                ),
            save: () => {
                void session.flush();
                setSavedFlash(true);
                window.clearTimeout(flashTimer.current);
                flashTimer.current = window.setTimeout(
                    () => setSavedFlash(false),
                    2000,
                );
            },
            print: () => router.visit(printHref),
            help: () => setShortcutsOpen(true),
            preview: () => setPreviewOpen(true),
        },
        plainShortcuts,
    );

    // Closing Controle puts the focus back on its button.
    const closeCheck = (): void => {
        setCheckOpen(false);
        const toggles = [
            ...document.querySelectorAll<HTMLElement>('[data-check-toggle]'),
        ];
        (
            toggles.find((node) => node.offsetParent !== null) ?? toggles[0]
        )?.focus();
    };

    // Escape closes Controle (dialogs close themselves).
    useEffect(() => {
        if (!checkOpen) {
            return;
        }
        const onKeyDown = (event: KeyboardEvent): void => {
            if (
                event.key !== 'Escape' ||
                event.defaultPrevented ||
                document.querySelector('[role="dialog"][data-state="open"]') !==
                    null
            ) {
                return;
            }
            closeCheck();
        };
        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, [checkOpen]);

    // A chosen element that scrolled out of its list (with J and K) comes back into view.
    useEffect(() => {
        // Only the sidebar scrolls, and never past the mini board that sticks at its top.
        const row = document.querySelector<HTMLElement>(
            'nav [aria-current="true"]',
        );
        const nav = row?.closest('nav');

        if (
            row === null ||
            row === undefined ||
            !(nav instanceof HTMLElement)
        ) {
            return;
        }
        const top =
            nav.getBoundingClientRect().top +
            (nav.querySelector<HTMLElement>('[data-sticky-board]')
                ?.offsetHeight ?? 0);
        const bounds = row.getBoundingClientRect();

        if (bounds.top < top) {
            nav.scrollTop -= top - bounds.top;
        } else if (bounds.bottom > nav.getBoundingClientRect().bottom) {
            nav.scrollTop += bounds.bottom - nav.getBoundingClientRect().bottom;
        }
    }, [key]);

    const saveStatus: ReactNode = (
        <>
            {saveText.message}
            {saveText.actionLabel !== null &&
                auth.user === null &&
                auth.googleLoginEnabled && (
                    <>
                        {' · '}
                        <a
                            href={googleRedirect().url}
                            className="font-semibold"
                        >
                            {saveText.actionLabel}
                        </a>
                    </>
                )}
        </>
    );

    const measureFrame = (node: HTMLDivElement | null): void => {
        if (node === null) {
            return;
        }
        const next = readProbe(node).frame;
        setMeasured((previous) => (sameSize(previous, next) ? previous : next));
    };

    const canGesture = photo !== undefined && context !== null;
    const gestures = canGesture
        ? {
              label: t('editor.photo_frame_label'),
              announcement,
              onPan: (dxMm: number, dyMm: number) =>
                  act({ type: 'pan', dxMm, dyMm }),
              onNudge: (direction: 'left' | 'right' | 'up' | 'down') =>
                  act(
                      { type: 'nudge', direction },
                      t('editor.moved', {
                          direction: t(`editor.dir_${direction}`),
                      }),
                  ),
              onZoomFactor: (factor: number) =>
                  act({
                      type: 'zoom-to',
                      scale: photo.scale * factor,
                  }),
              onZoomStep: (direction: 1 | -1) =>
                  act(
                      { type: 'zoom-by', delta: 0.1 * direction },
                      zoomText(
                          Math.min(
                              3,
                              Math.max(1, photo.scale + 0.1 * direction),
                          ),
                      ),
                  ),
          }
        : undefined;

    return (
        <EditorLayout
            editionName={edition.name}
            saveStatus={saveStatus}
            checkCount={issues.length}
            checkOpen={checkOpen}
            printHref={printHref}
            canUndo={canUndo}
            canRedo={canRedo}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenWords={() => setWordsOpen(true)}
            onOpenShortcuts={() => setShortcutsOpen(true)}
            onOpenPreview={() => setPreviewOpen(true)}
            onOpenCollect={() => setCollectOpen(true)}
            collectCount={waiting}
            onToggleCheck={toggleCheck}
            onUndo={() => session.undo()}
            onRedo={() => session.redo()}
        >
            <div className="relative flex h-full min-h-0 flex-col lg:grid lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)_minmax(300px,360px)]">
                {deletedElsewhere && (
                    <p
                        role="alert"
                        className="absolute inset-x-0 top-0 z-40 m-0 border-b-2 border-ink bg-warning px-4 py-3 text-sm"
                    >
                        {t('editor.deleted_elsewhere')}{' '}
                        <Link
                            href={editionsIndex(locale)}
                            className="font-semibold"
                        >
                            {t('editor.back_to_editions')}
                        </Link>
                    </p>
                )}
                {push.problem !== null && (
                    <p
                        role="alert"
                        className="absolute inset-x-0 top-0 z-40 m-0 border-b-2 border-ink bg-warning px-4 py-3 text-sm"
                    >
                        {t(`editor.sync_${push.problem}`)}
                    </p>
                )}
                {checkOpen && (
                    <CheckPanel
                        issues={issues}
                        edition={edition}
                        locale={locale}
                        onOpen={openFromCheck}
                        onClose={closeCheck}
                    />
                )}

                <nav
                    aria-label={t('editor.parts_nav')}
                    className={cn(
                        'min-h-0 flex-col gap-4 overflow-auto border-r-2 border-ink p-4 lg:flex',
                        mobileElement ? 'hidden' : 'flex flex-1',
                    )}
                >
                    <p className="m-0 text-sm text-ink-soft lg:hidden">
                        {saveStatus}
                    </p>
                    <div className="lg:hidden">
                        <CollectCard
                            count={waiting}
                            onOpen={() => setCollectOpen(true)}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <div
                            role="tablist"
                            aria-label={t('editor.part')}
                            className="grid auto-cols-fr grid-flow-col overflow-hidden rounded-control border-2 border-ink bg-card lg:grid-flow-row lg:grid-cols-2 lg:gap-2 lg:overflow-visible lg:border-0 lg:bg-transparent"
                        >
                            {tabs.map((id, index) => {
                                const counts = tabCounts(id, edition);

                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        role="tab"
                                        aria-selected={id === tab}
                                        title={`${t(TAB_LABEL[id])} (${index + 1})`}
                                        aria-keyshortcuts={`${index + 1} Alt+${index + 1}`}
                                        onClick={() => {
                                            const first = firstKey(
                                                id,
                                                edition.parts,
                                                edition.elements,
                                            );
                                            if (first !== undefined) {
                                                setSelectedKey(first);
                                                setDeedView(false);
                                            }
                                        }}
                                        className={cn(
                                            'flex min-h-11 cursor-pointer items-center justify-center border-0 px-1 text-sm font-semibold lg:justify-between lg:rounded-control lg:border-2 lg:border-ink lg:px-3',
                                            id === tab
                                                ? 'bg-ink text-paper'
                                                : 'bg-card text-ink',
                                        )}
                                    >
                                        {id === 'box' ? (
                                            <>
                                                <span className="lg:hidden">
                                                    {t('editor.tab_box_short')}
                                                </span>
                                                <span className="hidden lg:inline">
                                                    {t(TAB_LABEL[id])}
                                                </span>
                                            </>
                                        ) : (
                                            t(TAB_LABEL[id])
                                        )}
                                        <span className="hidden font-mono text-xs font-normal lg:inline">
                                            {counts.customized}/{counts.total}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            onClick={() => setSettingsOpen(true)}
                            className="min-h-11 cursor-pointer self-start border-0 bg-transparent p-0 text-sm font-semibold underline underline-offset-4"
                        >
                            {t('editor.choose_parts')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setWordsOpen(true)}
                            className="min-h-11 cursor-pointer self-start border-0 bg-transparent p-0 text-sm font-semibold underline underline-offset-4"
                        >
                            {t('words.open')}
                        </button>
                    </div>

                    {tab === 'board' ? (
                        <>
                            <div
                                data-sticky-board
                                className="sticky top-0 z-10 -mx-4 -mt-4 bg-paper px-4 pt-4 pb-2"
                            >
                                <BoardNavigator
                                    edition={edition}
                                    interfaceLanguage={locale}
                                    selected={key}
                                    onSelect={(next) => {
                                        setSelectedKey(next);
                                        setDeedView(false);
                                    }}
                                    warned={warned}
                                    onSwap={(from, to) => {
                                        const a = Number(from.slice(6));
                                        const b = Number(to.slice(6));

                                        session.apply(
                                            swapChanges(session.edition, a, b),
                                        );
                                    }}
                                />
                            </div>
                            <BoardList
                                edition={edition}
                                interfaceLanguage={locale}
                                selected={key}
                                onSelect={select}
                                warned={warned}
                            />
                        </>
                    ) : (
                        <ElementList
                            tab={tab}
                            edition={edition}
                            interfaceLanguage={locale}
                            selected={key}
                            onSelect={select}
                            warned={warned}
                            session={session}
                        />
                    )}
                </nav>

                <section
                    aria-label={t('editor.preview')}
                    data-preview
                    tabIndex={-1}
                    className={cn(
                        'min-h-0 flex-col gap-3 p-4 outline-none lg:flex',
                        mobileElement
                            ? 'flex h-[40dvh] max-h-[22rem] min-h-60 shrink-0 in-data-[keyboard=open]:h-auto in-data-[keyboard=open]:min-h-0 lg:h-auto lg:max-h-none'
                            : 'hidden',
                    )}
                >
                    <div className="flex items-center gap-2 lg:hidden">
                        <Button
                            variant="icon"
                            aria-label={t('editor.back_to_board')}
                            onClick={() => setMobileElement(false)}
                        >
                            <ChevronLeftIcon />
                        </Button>
                        <div className="min-w-0 flex-1">
                            <p className="m-0 truncate font-display text-xl font-extrabold">
                                {label}
                            </p>
                            <p className="m-0 text-sm text-ink-soft">
                                {subtitle}
                            </p>
                        </div>
                        <PanelMenu
                            session={session}
                            edition={edition}
                            editKey={editKey}
                            title={editLabel}
                            onRemoved={leaveRemoved}
                        />
                    </div>

                    {(editKind === 'card' || editKind === 'cardBack') &&
                        (() => {
                            const deck = key.split('.')[1];
                            if (deck !== 'chance' && deck !== 'chest') {
                                return null;
                            }

                            return (
                                <SegmentedTabs
                                    value={
                                        editKind === 'card' ? 'front' : 'back'
                                    }
                                    onValueChange={(value) =>
                                        select(
                                            value === 'back'
                                                ? cardBackKey(deck)
                                                : cardKey(deck, 1),
                                        )
                                    }
                                    className="self-center"
                                >
                                    <SegmentedTabsList
                                        aria-label={t('editor.card_side')}
                                    >
                                        <SegmentedTabsTrigger value="front">
                                            {t('editor.side_front')}
                                        </SegmentedTabsTrigger>
                                        <SegmentedTabsTrigger value="back">
                                            {t('editor.side_back')}
                                        </SegmentedTabsTrigger>
                                    </SegmentedTabsList>
                                </SegmentedTabs>
                            );
                        })()}

                    {deedKey !== undefined && (
                        <SegmentedTabs
                            value={showDeed ? 'deed' : 'space'}
                            onValueChange={(value) =>
                                setDeedView(value === 'deed')
                            }
                            className="self-center"
                        >
                            <SegmentedTabsList aria-label={t('editor.view')}>
                                <SegmentedTabsTrigger value="space">
                                    {t('editor.view_space')}
                                </SegmentedTabsTrigger>
                                <SegmentedTabsTrigger value="deed">
                                    {t('editor.view_deed')}
                                </SegmentedTabsTrigger>
                            </SegmentedTabsList>
                        </SegmentedTabs>
                    )}

                    <ElementStage
                        widthMm={size.w}
                        heightMm={size.h}
                        gestures={gestures}
                        overlay={
                            hasLayers
                                ? ({ pxPerMm }) => (
                                      <LayerOverlay
                                          layers={layers}
                                          area={size}
                                          pxPerMm={pxPerMm}
                                          selectedId={layerId}
                                          zones={
                                              editKind === 'boardCenter'
                                                  ? centerZones(
                                                        edition.boardProfile,
                                                    )
                                                  : undefined
                                          }
                                          onSelect={(id) =>
                                              setLayerSel({ key: editKey, id })
                                          }
                                          onChange={(layer, group) =>
                                              editElement(
                                                  session,
                                                  editKey,
                                                  {
                                                      layers: replaceLayer(
                                                          session.edition
                                                              .elements[editKey]
                                                              ?.layers ?? [],
                                                          layer,
                                                      ),
                                                  },
                                                  `${group}:${editKey}`,
                                              )
                                          }
                                          onRemove={(id) => {
                                              editElement(session, editKey, {
                                                  layers: layers.filter(
                                                      (item) => item.id !== id,
                                                  ),
                                              });
                                              setLayerSel({
                                                  key: editKey,
                                                  id: null,
                                              });
                                          }}
                                      />
                                  )
                                : undefined
                        }
                    >
                        {/* The key makes the frame be measured again when the photo changes. */}
                        <div
                            key={`${editKey}|${photo?.photoId ?? ''}`}
                            ref={measureFrame}
                        >
                            <ElementPreview
                                target={target}
                                resolved={resolved}
                                photos={photos}
                            />
                        </div>
                    </ElementStage>

                    {tab === 'board' && key === 'board_center' && (
                        <p className="m-0 text-center text-sm text-ink-soft">
                            {t('editor.center_hint')}
                        </p>
                    )}
                </section>

                <div
                    className={cn(
                        'min-h-0 flex-col border-l-2 border-ink bg-card lg:flex lg:overflow-auto',
                        mobileElement ? 'flex flex-1' : 'hidden',
                    )}
                >
                    <ElementPanel
                        session={session}
                        edition={edition}
                        resolved={resolved}
                        editKey={editKey}
                        title={editLabel}
                        context={context}
                        onAct={act}
                        cache={cache}
                        issues={issues}
                        siblings={siblings}
                        area={size}
                        selectedLayer={layerId}
                        onSelectLayer={(id) =>
                            setLayerSel({ key: editKey, id })
                        }
                        onRemoved={leaveRemoved}
                        onOpenWords={() => setWordsOpen(true)}
                        friends={{
                            contributions: collect.box?.contributions ?? [],
                            decision,
                            secret: collect.secret,
                            busy: collect.busy,
                        }}
                    />
                </div>

                {/* Phone: the actions sit at the bottom (Mobiel-bord, Editor-mobiel). */}
                <nav
                    aria-label={t('editor.actions')}
                    className="flex flex-none items-center gap-1.5 border-t-2 border-ink bg-card p-2 pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] min-[380px]:gap-2 lg:hidden"
                >
                    {mobileElement && (
                        <Button
                            variant="icon"
                            aria-label={t('editor.previous')}
                            onClick={() => {
                                const prev = neighbours(-1);
                                if (prev !== undefined) {
                                    setSelectedKey(prev);
                                    setDeedView(false);
                                }
                            }}
                        >
                            <ChevronLeftIcon />
                        </Button>
                    )}
                    <Button
                        variant={issues.length > 0 ? 'warning' : 'secondary'}
                        className="min-w-0 flex-1 px-2 min-[380px]:px-6"
                        aria-expanded={checkOpen}
                        data-check-toggle
                        onClick={toggleCheck}
                    >
                        {issues.length > 0 && <WarningIcon />}
                        {t('editor.check', { count: issues.length })}
                    </Button>
                    <Button
                        variant="icon"
                        aria-label={t('editor.undo')}
                        disabled={!canUndo}
                        onClick={() => session.undo()}
                    >
                        <UndoIcon />
                    </Button>
                    <Button
                        variant="icon"
                        aria-label={t('editor.redo')}
                        disabled={!canRedo}
                        onClick={() => session.redo()}
                    >
                        <RedoIcon />
                    </Button>
                    {mobileElement ? (
                        <Button
                            variant="icon"
                            aria-label={t('editor.next')}
                            onClick={() => {
                                const next = neighbours(1);
                                if (next !== undefined) {
                                    setSelectedKey(next);
                                    setDeedView(false);
                                }
                            }}
                        >
                            <ChevronLeftIcon className="rotate-180" />
                        </Button>
                    ) : (
                        <Button asChild className="px-4 min-[380px]:px-6">
                            <Link href={printHref}>{t('editor.print')}</Link>
                        </Button>
                    )}
                </nav>
            </div>

            {probe}

            <SettingsDialog
                session={session}
                edition={edition}
                interfaceLanguage={locale}
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
            />
            <PreviewDialog
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                edition={edition}
                resolved={resolved}
                photos={photos}
                onJump={(next) => {
                    if (next.startsWith('deed.')) {
                        const space = deedsFor()[Number(next.slice(5)) - 1];

                        if (space !== undefined) {
                            select(spaceKey(space.position));
                            setDeedView(true);
                        }

                        return;
                    }

                    select(next);
                }}
            />
            <WordsDialog
                session={session}
                edition={edition}
                open={wordsOpen}
                onOpenChange={setWordsOpen}
                onOpenElement={(next) => {
                    setWordsOpen(false);
                    select(next);
                }}
            />
            <CollectDialog
                open={collectOpen}
                onOpenChange={setCollectOpen}
                collect={collect}
                session={session}
                edition={edition}
                repository={repository}
                locale={locale}
                photos={photos}
                onPhoto={(record) => cache.add(record)}
            />
            <ShortcutsDialog
                open={shortcutsOpen}
                onOpenChange={setShortcutsOpen}
                plain={plainShortcuts}
                onPlainChange={(next) => {
                    setPlainShortcuts(next);
                    writePlainEnabled(next);
                }}
            />
            <p
                role="status"
                className={cn(
                    'pointer-events-none fixed bottom-24 left-1/2 z-50 m-0 -translate-x-1/2 rounded-control border-2 border-ink bg-ink px-4 py-2 text-sm font-semibold text-paper transition-opacity motion-reduce:transition-none lg:bottom-6',
                    savedFlash ? 'opacity-100' : 'opacity-0',
                )}
            >
                {savedFlash ? t('editor.saved_now') : ''}
            </p>
            <ConflictDialog
                conflict={conflict ?? push.conflict}
                locale={locale}
                onResolve={(choice) =>
                    conflict === null
                        ? push.resolve(choice)
                        : void session.resolveConflict(choice)
                }
            />
        </EditorLayout>
    );
}
