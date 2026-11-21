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
import { ConflictDialog } from '@/components/editor/conflict-dialog';
import {
    EditionPanel,
    type SectionRequest,
} from '@/components/editor/edition-panel';
import { EditionRow, FriendsRow } from '@/components/editor/edition-row';
import { ElementList } from '@/components/editor/element-list';
import {
    ElementPanel,
    kindLine,
    useElementStatus,
} from '@/components/editor/element-panel';
import {
    ElementPreview,
    previewSize,
} from '@/components/editor/element-preview';
import { ElementStage } from '@/components/editor/element-stage';
import { LayerOverlay } from '@/components/editor/layer-overlay';
import type { FriendsProps } from '@/components/editor/panel/friends-section';
import { useElementActions } from '@/components/editor/panel/panel-header';
import { PreviewDialog } from '@/components/editor/preview-dialog';
import { ShortcutsDialog } from '@/components/editor/shortcuts-dialog';
import { NameMenu, WaitingDot } from '@/components/editor-header';
import {
    ChevronLeftIcon,
    MoreIcon,
    RedoIcon,
    UndoIcon,
    WarningIcon,
    ZoomIcon,
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
import { nextContributionElement } from '@/lib/boxes/proposals';
import {
    ALLOWED_FIELDS,
    THEME_ACCENT_KEY,
    cardBackKey,
    cardKey,
    parseKey,
    spaceKey,
} from '@/lib/edition/keys';
import { createRemoteEditionStore } from '@/lib/edition/remote/store';
import { usedPhotoIds } from '@/lib/edition/repository';
import { resolveEdition } from '@/lib/edition/resolve';
import type { EditionSession } from '@/lib/edition/session';
import { createAccountActions } from '@/lib/editor/account-actions';
import {
    BOARD_ORDER,
    deedKeyForSpace,
    elementLabel,
    firstKey,
    isCustomized,
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
import { sectionOfKey, type EditionSection } from '@/lib/editor/edition-panel';
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
import { uploadAccountPhoto } from '@/lib/print/api';
import type { Size } from '@/lib/print/types';
import { cn } from '@/lib/utils';
import { redirect as googleRedirect } from '@/routes/auth/google';
import {
    index as editionsIndex,
    print as editionsPrint,
} from '@/routes/editions';
import { show as editorShow } from '@/routes/editor';

const TAB_LABEL: Record<EditorTab, string> = {
    board: 'editor.tab_board',
    cards: 'editor.tab_cards',
    money: 'editor.tab_money',
    box: 'editor.tab_box',
};

function sameSize(a: Size | null, b: Size | null): boolean {
    return a === b || (a !== null && b !== null && a.w === b.w && a.h === b.h);
}

interface EditorWorkspaceProps {
    session: EditionSession;
}

function isTextTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return (
        target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    );
}

/**
 * The editor (B73, B93, B144, B145): tabs per part, the board as navigator, the chosen element large in the
 * middle, and its fields on the right. The edition itself is an element too: the row "Editie" on top of the left
 * column shows the whole board and the edition panel. On a phone the overview and the element (or the edition)
 * are two screens, each with one back arrow.
 */
export function EditorWorkspace({ session }: EditorWorkspaceProps) {
    const t = useTranslation();
    const { locale, auth } = usePage().props;
    const { repository } = useServices();
    const { edition, canUndo, canRedo, conflict, deletedElsewhere } =
        useSessionSnapshot(session);
    const push = useRemotePush(session);
    const collect = useCollectionBox(edition, auth.user !== null);
    const contributions = collect.box?.contributions ?? [];
    const waiting = contributions.length;
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
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [plainShortcuts, setPlainShortcuts] = useState(readPlainEnabled);
    const [savedFlash, setSavedFlash] = useState(false);
    const [mobileElement, setMobileElement] = useState(false);
    // The edition as an element (B145): the whole board in the middle and the edition panel on the right.
    const [editionOpen, setEditionOpen] = useState(false);
    const [sectionRequest, setSectionRequest] = useState<SectionRequest | null>(
        null,
    );
    // Phone: the mini board starts small; a tap enlarges it to pick a space (B144).
    const [boardOpen, setBoardOpen] = useState(false);
    const [duplicateFailed, setDuplicateFailed] = useState(false);
    const [announcement, setAnnouncement] = useState('');
    const [measured, setMeasured] = useState<Size | null>(null);
    const [layerSel, setLayerSel] = useState<{
        key: string;
        id: string | null;
    }>({ key: '', id: null });

    const resolved = useMemo(() => resolveEdition(edition), [edition]);
    const photos = useSyncExternalStore(cache.subscribe, cache.getSnapshot);
    // What friends sent (B128, B175): "Van vrienden" per element and the overview in Samen maken use the same.
    const friends: FriendsProps = {
        contributions,
        edition,
        locale,
        decision,
        secret: collect.secret,
        busy: collect.busy,
        photos,
    };
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
    const showDeed = !editionOpen && deedView && deedKey !== undefined;
    const editKey = showDeed ? deedKey : key;
    // The edition shows the whole board, drawn by the same renderer as the print (B145).
    const target = editionOpen
        ? { key: THEME_ACCENT_KEY }
        : { key, deed: showDeed };
    const editKind = editionOpen ? undefined : parseKey(editKey)?.kind;
    const hasLayers =
        editKind !== undefined && ALLOWED_FIELDS[editKind].includes('layers');
    const layerId = layerSel.key === editKey ? layerSel.id : null;
    const layers = edition.elements[editKey]?.layers ?? [];

    const part = editionOpen ? undefined : lookupResolved(resolved, editKey);
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
        const frameId = requestAnimationFrame(() => {
            const pick = (selector: string) =>
                document.querySelector<HTMLElement>(selector);
            const found =
                pick(`[data-field="${focusRequest.field}"]`) ??
                pick('[data-focus-view]') ??
                pick('[data-field]') ??
                pick('[data-preview]');
            found?.focus();
        });

        return () => cancelAnimationFrame(frameId);
    }, [focusRequest]);

    const requestFocus = (field: string): void =>
        setFocusRequest((previous) => ({
            n: (previous?.n ?? 0) + 1,
            field,
        }));

    /** Shows the edition panel (B145), at a section when one is asked for. */
    const openEdition = (section: EditionSection = 'general'): void => {
        setEditionOpen(true);
        setCheckOpen(false);
        setMobileElement(true);
        setSectionRequest((previous) => ({
            section,
            n: (previous?.n ?? 0) + 1,
        }));
    };

    const select = (next: string): void => {
        if (next !== selectedKey) {
            // "Toegepast op…" belongs to the element it was said at (bug 30).
            decision.clear();
        }
        setSelectedKey(next);
        setDeedView(false);
        setCheckOpen(false);
        setEditionOpen(false);
        setBoardOpen(false);
        setMobileElement(true);
    };

    const openFromCheck = (next: string, field: string): void => {
        const section = sectionOfKey(next);
        if (section !== null) {
            openEdition(section);
            requestFocus(`${next}.${field}`);

            return;
        }
        select(next);
        requestFocus(field.startsWith('layer') ? 'photo' : field);
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

    const label = editionOpen
        ? t('editor.edition_row')
        : elementLabel(key, edition, locale);
    const subtitle = editionOpen
        ? t('edition_panel.kind')
        : kindLine(key, edition, resolved, t, locale);
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

    // One status line and one set of element actions, shared by the panel and the phone's top bar menu (B151).
    const elementStatus = useElementStatus(editKey);
    const elementActions = useElementActions({
        session,
        edition,
        editKey,
        title: editLabel,
        onRemoved: () => {
            elementStatus.carry();
            leaveRemoved();
        },
        onAnnounce: elementStatus.announce,
    });

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

    const goTo = (next: string | undefined): void => {
        if (next !== undefined) {
            setSelectedKey(next);
            setDeedView(false);
            setEditionOpen(false);
        }
    };

    const step = (direction: 1 | -1): void => goTo(neighbours(direction));

    const openTab = (id: EditorTab): void =>
        goTo(firstKey(id, edition.parts, edition.elements));

    const toggleCheck = (): void => setCheckOpen((open) => !open);

    const duplicate = async (): Promise<void> => {
        setDuplicateFailed(false);
        try {
            await session.flush();
            const copy = await repository.duplicate(edition.id);
            if (auth.user !== null) {
                await createAccountActions(
                    createRemoteEditionStore({
                        uploadPhoto: uploadAccountPhoto,
                    }),
                ).copy(edition.id, copy);
            }
            router.visit(editorShow({ locale, edition: copy.id }).url);
        } catch {
            setDuplicateFailed(true);
        }
    };

    const openFriends = (): void => {
        // Each press goes to the next element with something waiting (bug 30); new cards wait in Samen maken.
        const next = nextContributionElement(
            contributions.filter((item) => item.open.length > 0),
            editionOpen ? '' : key,
        );
        if (next === undefined) {
            openEdition('together');
        } else {
            select(next);
        }
    };

    useEditorShortcuts(
        {
            next: () => step(1),
            previous: () => step(-1),
            tab: (index) => {
                const id = tabs[index];
                if (id !== undefined) {
                    openTab(id);
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
            edition: () => openEdition(),
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

    // A chosen element that scrolled out of its list (with J and K) comes back into view. Only the list scrolls,
    // never the column around it, so the row Editie and the tabs stay in sight (bug 3).
    useEffect(() => {
        const list = document.querySelector<HTMLElement>('[data-scroll-list]');
        const row = list?.querySelector<HTMLElement>('[aria-current="true"]');

        if (
            list === null ||
            list === undefined ||
            row === null ||
            row === undefined ||
            list.scrollHeight <= list.clientHeight
        ) {
            return;
        }
        const bounds = row.getBoundingClientRect();
        const box = list.getBoundingClientRect();

        if (bounds.top < box.top) {
            list.scrollTop -= box.top - bounds.top;
        } else if (bounds.bottom > box.bottom) {
            list.scrollTop += bounds.bottom - box.bottom;
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

    const menu = {
        onSettings: () => openEdition(),
        onCollect: () => openEdition('together'),
        collectCount: waiting,
        onShortcuts: () => setShortcutsOpen(true),
        onDuplicate: () => void duplicate(),
        onPreview: () => setPreviewOpen(true),
    };

    // Phone, on an element or the edition: one top bar with one back arrow, the name and the menu (§3.6).
    const phoneBar = mobileElement ? (
        <>
            <Button
                variant="icon"
                aria-label={t('editor.back_to_board')}
                onClick={() => setMobileElement(false)}
            >
                <ChevronLeftIcon />
            </Button>
            <div className="min-w-0 flex-1">
                <p className="m-0 truncate font-display text-lg leading-tight font-extrabold">
                    {label}
                </p>
                <p className="m-0 flex min-w-0 items-center gap-2 text-sm text-ink-soft">
                    {editionOpen ? (
                        <span className="truncate">
                            {t('edition_panel.applies')}
                        </span>
                    ) : isCustomized(edition, key) ? (
                        // Like the panel head on a desktop (§3.3): the kind, then a dot when the element changed.
                        <>
                            <span className="truncate">{subtitle}</span>
                            <span
                                aria-hidden="true"
                                className="size-2 flex-none rounded-full bg-ink"
                            />
                            <span className="flex-none">
                                {t('editor.customized')}
                            </span>
                        </>
                    ) : (
                        <span className="truncate">{`${subtitle} · ${edition.name}`}</span>
                    )}
                </p>
            </div>
            <NameMenu
                editionName={edition.name}
                {...menu}
                printHref={printHref}
                element={
                    !editionOpen && elementActions.actions.length > 0
                        ? { title: editLabel, items: elementActions.items }
                        : undefined
                }
            >
                <Button
                    variant="icon"
                    className="relative"
                    aria-label={
                        !editionOpen && elementActions.actions.length > 0
                            ? t('editor.element_name_menu', {
                                  element: editLabel,
                                  name: edition.name,
                              })
                            : t('editor.name_menu', { name: edition.name })
                    }
                >
                    <MoreIcon />
                    {waiting > 0 && (
                        <WaitingDot className="absolute top-1.5 right-1.5" />
                    )}
                </Button>
            </NameMenu>
            {!editionOpen && elementActions.dialogs}
        </>
    ) : undefined;

    const deck = key.split('.')[1];

    return (
        <EditorLayout
            editionName={edition.name}
            saveStatus={saveStatus}
            checkCount={issues.length}
            checkOpen={checkOpen}
            printHref={printHref}
            canUndo={canUndo}
            canRedo={canRedo}
            onOpenPreview={() => setPreviewOpen(true)}
            onToggleCheck={toggleCheck}
            onUndo={() => session.undo()}
            onRedo={() => session.redo()}
            menu={menu}
            phoneBar={phoneBar}
        >
            <div className="relative flex h-full min-h-0 flex-col lg:grid lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)_minmax(320px,380px)]">
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
                {(push.problem !== null || duplicateFailed) && (
                    <p
                        role="alert"
                        className="absolute inset-x-0 top-0 z-40 m-0 border-b-2 border-ink bg-warning px-4 py-3 text-sm"
                    >
                        {push.problem !== null
                            ? t(`editor.sync_${push.problem}`)
                            : t('editor.menu_duplicate_failed')}
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
                        'min-h-0 flex-col border-r-2 border-ink lg:flex lg:overflow-hidden',
                        mobileElement ? 'hidden' : 'flex flex-1 overflow-auto',
                    )}
                >
                    <div className="flex flex-none flex-col gap-3 p-4 pb-3">
                        <p className="m-0 text-sm text-ink-soft lg:hidden">
                            {saveStatus}
                        </p>
                        <EditionRow
                            resolved={resolved}
                            interfaceLanguage={locale}
                            selected={editionOpen}
                            onSelect={() => openEdition()}
                        />
                        <div
                            role="tablist"
                            aria-label={t('editor.part')}
                            className="grid auto-cols-fr grid-flow-col overflow-hidden rounded-control border-2 border-ink bg-card"
                        >
                            {tabs.map((id, index) => {
                                const counts = tabCounts(id, edition);

                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        role="tab"
                                        aria-selected={
                                            id === tab && !editionOpen
                                        }
                                        title={`${t(TAB_LABEL[id])} (${index + 1})`}
                                        aria-keyshortcuts={`${index + 1} Alt+${index + 1}`}
                                        onClick={() => openTab(id)}
                                        className={cn(
                                            'flex min-h-12 min-w-0 cursor-pointer flex-col items-center justify-center border-0 border-l-2 border-ink px-1 py-1 text-sm leading-tight font-semibold first:border-l-0',
                                            id === tab && !editionOpen
                                                ? 'bg-ink text-paper'
                                                : 'bg-card text-ink',
                                        )}
                                    >
                                        <span className="max-w-full truncate">
                                            {id === 'box'
                                                ? t('editor.tab_box_short')
                                                : t(TAB_LABEL[id])}
                                        </span>
                                        <span className="font-mono text-xs font-normal">
                                            {counts.customized}/{counts.total}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {waiting > 0 && (
                            <FriendsRow count={waiting} onOpen={openFriends} />
                        )}
                        {tab === 'board' && (
                            <div className="flex justify-center lg:block">
                                {/* Phone: small and not sticky, so the list is the main route; a tap enlarges it. */}
                                <div
                                    className={cn(
                                        'relative w-full lg:max-w-none',
                                        !boardOpen &&
                                            'max-lg:aspect-square max-lg:w-[min(100%,33dvh)] max-lg:overflow-hidden',
                                    )}
                                    data-mini-board={
                                        boardOpen ? 'open' : 'compact'
                                    }
                                >
                                    <BoardNavigator
                                        edition={edition}
                                        interfaceLanguage={locale}
                                        selected={editionOpen ? '' : key}
                                        onSelect={(next) => {
                                            // A space picked on the enlarged phone board opens, like a row of the list.
                                            if (
                                                window.matchMedia(
                                                    '(min-width: 1024px)',
                                                ).matches
                                            ) {
                                                goTo(next);
                                            } else {
                                                select(next);
                                            }
                                        }}
                                        warned={warned}
                                        onSwap={(from, to) => {
                                            const a = Number(from.slice(6));
                                            const b = Number(to.slice(6));

                                            session.apply(
                                                swapChanges(
                                                    session.edition,
                                                    a,
                                                    b,
                                                ),
                                            );
                                        }}
                                    />
                                    {!boardOpen && (
                                        <button
                                            type="button"
                                            data-board-open
                                            aria-label={t('editor.board_pick')}
                                            onClick={() => setBoardOpen(true)}
                                            className="absolute inset-0 z-20 flex cursor-pointer items-end justify-end border-0 bg-transparent p-2 lg:hidden"
                                        >
                                            <span className="inline-flex items-center gap-1 rounded-control border-2 border-ink bg-card px-2 py-1 text-sm font-semibold">
                                                <ZoomIcon size={16} />
                                                {t('editor.board_pick_short')}
                                            </span>
                                        </button>
                                    )}
                                    {boardOpen && (
                                        <Button
                                            variant="secondary"
                                            className="mt-2 w-full lg:hidden"
                                            onClick={() => setBoardOpen(false)}
                                        >
                                            {t('editor.board_smaller')}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div
                        data-scroll-list
                        className="flex flex-col px-4 pb-4 lg:min-h-0 lg:flex-1 lg:overflow-auto"
                    >
                        {tab === 'board' ? (
                            <BoardList
                                edition={edition}
                                interfaceLanguage={locale}
                                selected={editionOpen ? '' : key}
                                onSelect={select}
                                warned={warned}
                            />
                        ) : (
                            <ElementList
                                tab={tab}
                                edition={edition}
                                interfaceLanguage={locale}
                                selected={editionOpen ? '' : key}
                                onSelect={select}
                                warned={warned}
                                session={session}
                            />
                        )}
                    </div>
                </nav>

                <section
                    aria-label={t('editor.preview')}
                    data-preview
                    tabIndex={-1}
                    className={cn(
                        'min-h-0 flex-col gap-3 p-4 outline-none lg:flex',
                        mobileElement
                            ? cn(
                                  'flex shrink-0 in-data-[keyboard=open]:h-auto in-data-[keyboard=open]:min-h-0 lg:h-auto lg:max-h-none',
                                  editionOpen
                                      ? 'h-[30dvh] max-h-64 min-h-44'
                                      : 'h-[40dvh] max-h-[22rem] min-h-60',
                              )
                            : 'hidden',
                    )}
                >
                    {!editionOpen &&
                        (editKind === 'card' || editKind === 'cardBack') &&
                        (deck === 'chance' || deck === 'chest') && (
                            <SegmentedTabs
                                value={editKind === 'card' ? 'front' : 'back'}
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
                        )}

                    {!editionOpen && deedKey !== undefined && (
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
                        {/* The key makes the frame be measured again when the photo changes or finishes
                            loading: after a reload the photo slot only appears once the cache has the photo. */}
                        <div
                            key={`${target.key}|${photo?.photoId ?? ''}|${info === undefined ? '' : 'loaded'}`}
                            ref={measureFrame}
                        >
                            <ElementPreview
                                target={target}
                                resolved={resolved}
                                photos={photos}
                            />
                        </div>
                    </ElementStage>

                    {!editionOpen &&
                        tab === 'board' &&
                        key === 'board_center' && (
                            <p className="m-0 text-center text-sm text-ink-soft">
                                {t('editor.center_hint')}
                            </p>
                        )}
                </section>

                <div
                    className={cn(
                        'min-h-0 flex-col border-ink bg-card lg:flex lg:border-l-2',
                        editionOpen ? 'lg:overflow-hidden' : 'lg:overflow-auto',
                        mobileElement ? 'flex flex-1' : 'hidden',
                        mobileElement && !editionOpen && 'overflow-auto',
                    )}
                >
                    {editionOpen ? (
                        <EditionPanel
                            session={session}
                            edition={edition}
                            resolved={resolved}
                            interfaceLanguage={locale}
                            issues={issues}
                            collect={collect}
                            friends={friends}
                            onOpenElement={select}
                            request={sectionRequest}
                        />
                    ) : (
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
                            status={elementStatus}
                            onOpenWords={() => openEdition('words')}
                            friends={friends}
                        />
                    )}
                </div>

                {/* Phone: the actions sit at the bottom (Mobiel-bord, Editor-mobiel, B138 §3.6). */}
                <nav
                    aria-label={t('editor.actions')}
                    className="flex flex-none items-center gap-1.5 border-t-2 border-ink bg-card p-2 pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] min-[380px]:gap-2 lg:hidden"
                >
                    {mobileElement && !editionOpen && (
                        <Button
                            variant="icon"
                            aria-label={t('editor.previous')}
                            onClick={() => step(-1)}
                        >
                            <ChevronLeftIcon />
                        </Button>
                    )}
                    <Button
                        variant={issues.length > 0 ? 'warning' : 'secondary'}
                        className="min-w-0 flex-1 px-2 min-[380px]:px-4"
                        aria-expanded={checkOpen}
                        data-check-toggle
                        onClick={toggleCheck}
                    >
                        {issues.length > 0 && (
                            <WarningIcon className="flex-none max-[379px]:hidden" />
                        )}
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
                    {mobileElement && !editionOpen ? (
                        <Button
                            variant="icon"
                            aria-label={t('editor.next')}
                            onClick={() => step(1)}
                        >
                            <ChevronLeftIcon className="rotate-180" />
                        </Button>
                    ) : (
                        <Button
                            variant="secondary"
                            className="min-w-0 flex-1 px-2 min-[380px]:px-4"
                            onClick={() => setPreviewOpen(true)}
                        >
                            {t('editor.preview_button')}
                        </Button>
                    )}
                </nav>
            </div>

            {probe}

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
