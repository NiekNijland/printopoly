import { Link, router, usePage } from '@inertiajs/react';
import {
    useEffect,
    useRef,
    useMemo,
    useState,
    useSyncExternalStore,
    type ReactNode,
    type UIEvent,
} from 'react';

import { BigBoard } from '@/components/editor/big-board';
import { BoardList, BoardNavigator } from '@/components/editor/board-navigator';
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
import { ListPhotosButton } from '@/components/editor/list-photos';
import { ListSearch } from '@/components/editor/list-search';
import { usePasteSummary } from '@/components/editor/name-row';
import { OpenMessages } from '@/components/editor/open-messages';
import type { FriendsProps } from '@/components/editor/panel/friends-section';
import { UploadStatus } from '@/components/editor/panel/image-section';
import { useElementActions } from '@/components/editor/panel/panel-header';
import { PlacedList } from '@/components/editor/panel/placed-list';
import { usePhotoUpload } from '@/components/editor/panel/use-photo-upload';
import { PreviewDialog } from '@/components/editor/preview-dialog';
import { ShareBoardDialog } from '@/components/editor/share-board-dialog';
import { ShortcutsDialog } from '@/components/editor/shortcuts-dialog';
import { NameMenu, WaitingDot } from '@/components/editor-header';
import {
    CheckIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    MoreIcon,
    RedoIcon,
    UndoIcon,
    ZoomIcon,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    SegmentedTabs,
    SegmentedTabsList,
    SegmentedTabsTrigger,
} from '@/components/ui/segmented-tabs';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBackCloses } from '@/hooks/use-back-closes';
import { useCollectionBox } from '@/hooks/use-collection-box';
import { useContributionDecision } from '@/hooks/use-contribution-decision';
import { useSaveStatus, useSessionSnapshot } from '@/hooks/use-edition-session';
import { useServices } from '@/hooks/use-editions';
import { useEditorShortcuts } from '@/hooks/use-editor-shortcuts';
import {
    useFoldablePreview,
    useShortScreen,
    useWideScreen,
} from '@/hooks/use-media-query';
import { useRemotePush } from '@/hooks/use-remote-push';
import { useTranslation } from '@/hooks/use-translation';
import EditorLayout from '@/layouts/editor-layout';
import { nextContributionElement } from '@/lib/boxes/proposals';
import { deedCrop } from '@/lib/edition/deed-photos';
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
import type { EditionSession, SessionEvent } from '@/lib/edition/session';
import { createAccountActions } from '@/lib/editor/account-actions';
import {
    BOARD_ORDER,
    EDITOR_TABS,
    deedKeyForSpace,
    elementLabel,
    firstKey,
    isCustomized,
    spacePosition,
    stepKey,
    tabKeys,
    tabOfKey,
    type EditorTab,
} from '@/lib/editor/catalogue';
import { readProbe } from '@/lib/editor/checks-input';
import { editElement } from '@/lib/editor/edit';
import {
    EDITION_SECTIONS,
    sectionOfKey,
    type EditionSection,
} from '@/lib/editor/edition-panel';
import { describeHistoryStep } from '@/lib/editor/history-note';
import { centerZones, lidZones, replaceLayer } from '@/lib/editor/layers';
import { listScrollDelta } from '@/lib/editor/list-scroll';
import { lookupResolved } from '@/lib/editor/lookup';
import { pasteNames } from '@/lib/editor/name-list';
import { photoBleed } from '@/lib/editor/photo-bleed';
import { PhotoCache } from '@/lib/editor/photo-cache';
import { photoSwapChanges } from '@/lib/editor/photo-swap';
import {
    actOnPlacement,
    type PlacementAction,
    type PlacementContext,
} from '@/lib/editor/placements';
import {
    checkView,
    editorView,
    partsInSet,
} from '@/lib/editor/print-selection';
import { readPlainEnabled, writePlainEnabled } from '@/lib/editor/shortcuts';
import { swapChanges } from '@/lib/editor/swap';
import { deedsFor, standardEdition } from '@/lib/game/standard-edition';
import { MAX_ZOOM, minZoom } from '@/lib/photos/transform';
import { uploadAccountPhoto } from '@/lib/print/api';
import type { Size } from '@/lib/print/types';
import { cn } from '@/lib/utils';
import { redirect as googleRedirect } from '@/routes/auth/google';
import {
    index as editionsIndex,
    print as editionsPrint,
} from '@/routes/editions';
import { show as editorShow } from '@/routes/editor';

/** The back arrow names the list it goes back to (R6 Aisha, Sara). */
const BACK_LABEL: Record<EditorTab, string> = {
    board: 'editor.back_to_board',
    cards: 'editor.back_to_cards',
    money: 'editor.back_to_money',
    box: 'editor.back_to_box',
};

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

/** Where an element shows: a title deed on its space, with the switch on Eigendomsbewijs. */
function shownFor(key: string): { key: string; deed: boolean } {
    if (parseKey(key)?.kind !== 'deed') {
        return { key, deed: false };
    }
    const space = deedsFor()[Number(key.slice('deed.'.length)) - 1];

    return space === undefined
        ? { key: 'space.01', deed: false }
        : { key: spaceKey(space.position), deed: true };
}

/** What the address asks the editor to show at first; the parameters come off it, so a reload is plain. */
interface StartRequest {
    /** `?check=1`: the open messages (B197). */
    messages: boolean;
    /** `?element=card.chance.03&field=photo`: an element and its field, from "Nog even nakijken" (B197). */
    element?: { key: string; field: string };
    /** `?edition=words`: the edition panel at a section (vindbaarheid point 4). */
    section?: EditionSection;
    /** `?edition=general&field=edition.name`: and the field to put the focus in, after Dupliceren (point 6). */
    sectionField?: string;
}

function readStartRequest(): StartRequest {
    if (typeof window === 'undefined') {
        return { messages: false };
    }
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const key = params.get('element');
    const section = EDITION_SECTIONS.find(
        (candidate) => candidate === params.get('edition'),
    );
    const request: StartRequest = {
        messages: params.get('check') === '1',
        element:
            key !== null && parseKey(key) !== null
                ? { key, field: params.get('field') ?? '' }
                : undefined,
        section,
        sectionField:
            section !== undefined && key === null
                ? (params.get('field') ?? undefined)
                : undefined,
    };
    if (
        ['check', 'element', 'field', 'edition'].some((name) =>
            params.has(name),
        )
    ) {
        for (const name of ['check', 'element', 'field', 'edition']) {
            params.delete(name);
        }
        window.history.replaceState(window.history.state, '', url.toString());
    }

    return request;
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
    const {
        edition: stored,
        canUndo,
        canRedo,
        conflict,
        deletedElsewhere,
    } = useSessionSnapshot(session);
    // The editor always shows every part (B198); what goes into the set is chosen on the print page.
    const edition = useMemo(() => editorView(stored), [stored]);
    const inSet = useMemo(() => partsInSet(stored), [stored]);
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
    const { status: saveState, text: saveText } = useSaveStatus(session, {
        loggedIn: push.loggedIn,
        pendingSync: push.pending,
        syncedAt: push.syncedAt,
    });

    // Read once: the print page sends people here to a message, a field or a section (B197).
    const [start] = useState(readStartRequest);
    const startShown =
        start.element !== undefined && sectionOfKey(start.element.key) === null
            ? shownFor(start.element.key)
            : { key: 'space.01', deed: false };
    const [selectedKey, setSelectedKey] = useState(startShown.key);
    const [deedView, setDeedView] = useState(startShown.deed);
    // The open messages, behind the key C (B197); no button or counter while you work.
    const [messagesOpen, setMessagesOpen] = useState(start.messages);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [plainShortcuts, setPlainShortcuts] = useState(readPlainEnabled);
    // A short note at the bottom: "Bewaard" after Ctrl+S, what came back after undo or redo (UX 7).
    const [flash, setFlash] = useState<string | null>(null);
    const startSection =
        start.section ??
        (start.element === undefined
            ? undefined
            : (sectionOfKey(start.element.key) ?? undefined));
    const [mobileElement, setMobileElement] = useState(
        start.element !== undefined || startSection !== undefined,
    );
    // The edition as an element (B145): the whole board in the middle and the edition panel on the right.
    const [editionOpen, setEditionOpen] = useState(startSection !== undefined);
    const [sectionRequest, setSectionRequest] = useState<SectionRequest | null>(
        startSection === undefined ? null : { section: startSection, n: 1 },
    );
    // Phone and tablet upright: the preview sits on top of the fields and folds to one line, by hand or as soon as
    // the fields scroll, so the form is the main thing (B155, UX 5 ronde 4). Only a fold made by scrolling opens
    // again by scrolling back to the top; a fold by hand stays.
    const [previewFolded, setPreviewFolded] = useState(false);
    const foldedByScroll = useRef(false);
    const foldable = useFoldablePreview();
    const folded = foldable && previewFolded;
    const togglePreview = (): void => {
        foldedByScroll.current = false;
        setPreviewFolded((was) => !was);
    };
    const onFieldsScroll = (event: UIEvent<HTMLElement>): void => {
        const target = event.target;
        if (!foldable || !(target instanceof HTMLElement)) {
            return;
        }
        // Only when the fields stay scrollable once the preview is small, or the fold would undo itself.
        const preview =
            document.querySelector<HTMLElement>('[data-preview]')
                ?.offsetHeight ?? 0;
        const room = target.scrollHeight - target.clientHeight;
        if (target.scrollTop > 48 && !previewFolded && room > preview) {
            foldedByScroll.current = true;
            setPreviewFolded(true);
        } else if (
            target.scrollTop <= 0 &&
            previewFolded &&
            foldedByScroll.current
        ) {
            foldedByScroll.current = false;
            setPreviewFolded(false);
        }
    };
    // The big board to pick a space from (B144, UX 2 ronde 3); on a phone a tap on the small board opens it.
    const [bigBoard, setBigBoard] = useState(false);
    // The small board folds to one line on a screen lower than 900 px (vindbaarheid point 16), until opened.
    const shortScreen = useShortScreen();
    const [boardChoice, setBoardChoice] = useState<boolean | null>(null);
    const boardShown = boardChoice ?? !shortScreen;
    // Two or three columns, or one screen at a time on a phone (below 768 px, B155).
    const wide = useWideScreen();
    // The back button of a phone closes what lies open first, the element screen last (R5-14).
    useBackCloses(!wide && mobileElement, () => setMobileElement(false));
    useBackCloses(bigBoard, () => setBigBoard(false));
    useBackCloses(previewOpen, () => setPreviewOpen(false));
    useBackCloses(shareOpen, () => setShareOpen(false));
    useBackCloses(shortcutsOpen, () => setShortcutsOpen(false));
    useBackCloses(messagesOpen, () => setMessagesOpen(false));
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
    // "Foto's" next to the search of the board list (B237): many photos at once, each on the space of its name.
    const listUpload = usePhotoUpload({
        session,
        edition,
        editKey: null,
        cache,
        siblings: [],
        canHold: true,
        labelOf: (element) => elementLabel(element, edition, locale),
        pasteShortcut: false,
    });

    useEffect(() => {
        cache.request(photoIds === '' ? [] : photoIds.split(','));
    }, [cache, photoIds]);
    useEffect(() => () => cache.dispose(), [cache]);

    // Only the parts of the set give messages (B197, B198).
    const checked = useMemo(() => checkView(stored), [stored]);
    const { issues, probe } = useChecks(checked, photos);

    // Warnings per element; a deed's warning also marks its space on the board.
    const warned = useMemo(() => {
        const keys = new Set<string>();
        for (const issue of issues) {
            keys.add(issue.elementKey);
            // A message about a group marks each element it is about (R5-09).
            issue.alsoKeys?.forEach((key) => keys.add(key));
            if (parseKey(issue.elementKey)?.kind === 'deed') {
                const index = Number(issue.elementKey.split('.')[1]);
                resolved.deeds
                    ?.filter((deed) => deed.index === index)
                    .forEach((deed) => keys.add(spaceKey(deed.space.position)));
            }
        }

        return keys;
    }, [issues, resolved]);

    // A key that left its tab (a removed pawn or card) falls back to the board.
    const tabs = EDITOR_TABS;
    const activeTab = tabOfKey(selectedKey);
    const valid = tabKeys(activeTab, edition.elements).includes(selectedKey);
    const key = valid ? selectedKey : 'space.01';
    const tab = tabOfKey(key);
    const position = spacePosition(key);
    const deedKey =
        position === undefined ? undefined : deedKeyForSpace(position);
    const showDeed = !editionOpen && deedView && deedKey !== undefined;
    const editKey = showDeed ? deedKey : key;
    // The edition shows the whole board, drawn by the same renderer as the print (B145).
    const target = editionOpen
        ? { key: THEME_ACCENT_KEY }
        : { key, deed: showDeed };
    const editKind = editionOpen ? undefined : parseKey(editKey)?.kind;
    // A card back keeps no free layers (B203).
    const hasLayers =
        editKind !== undefined &&
        editKind !== 'cardBack' &&
        ALLOWED_FIELDS[editKind].includes('layers');
    const layerId = layerSel.key === editKey ? layerSel.id : null;
    const layers = edition.elements[editKey]?.layers ?? [];

    const part = editionOpen ? undefined : lookupResolved(resolved, editKey);
    const shownPhoto = part?.photo;
    const size = previewSize(target, edition);

    const info =
        shownPhoto === undefined ? undefined : photos.get(shownPhoto.photoId);
    // A deed that borrows the photo of its space starts from the crop of its own frame (B177); moving it there makes
    // that crop the deed's own.
    const photo =
        shownPhoto?.borrowed === true
            ? deedCrop(shownPhoto, info, part?.photoStyle)
            : shownPhoto;
    const frame = measured === null ? null : { w: measured.w, h: measured.h };
    const context: PlacementContext | null =
        info !== undefined && frame !== null
            ? {
                  source: { w: info.width, h: info.height },
                  frame,
                  bleed: photoBleed(editKey, part?.photoStyle),
              }
            : null;

    // From "Nog even nakijken" on the print page or after Dupliceren: straight to the field (B197, point 6).
    const [focusRequest, setFocusRequest] = useState<{
        n: number;
        field: string;
    } | null>(() => {
        const { element, sectionField } = start;
        if (element !== undefined) {
            const field =
                sectionOfKey(element.key) !== null
                    ? `${element.key}.${element.field}`
                    : element.field.startsWith('layer')
                      ? 'photo'
                      : element.field;

            return { n: 1, field };
        }

        return sectionField === undefined
            ? null
            : { n: 1, field: sectionField };
    });

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
        setEditionOpen(false);
        setBigBoard(false);
        setMobileElement(true);
    };

    const openFromCheck = (next: string, field: string): void => {
        const section = sectionOfKey(next);
        if (section !== null) {
            openEdition(section);
            requestFocus(`${next}.${field}`);

            return;
        }
        const shown = shownFor(next);
        select(shown.key);
        setDeedView(shown.deed);
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

    // The search above the list (B161), one per tab: the board and the cards have long lists.
    const [queries, setQueries] = useState<Partial<Record<EditorTab, string>>>(
        {},
    );
    const searchable = tab === 'board' || tab === 'cards';
    const query = queries[tab] ?? '';

    const tabKeyList = tabKeys(tab, edition.elements);
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
        const { elements } = session.edition;
        const list = tabKeys(tab, elements);
        const before = Math.max(0, tabKeyList.indexOf(key) - 1);
        setSelectedKey(
            list.includes(key)
                ? key
                : (list[before] ?? firstKey(tab, elements) ?? 'space.01'),
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
        photos,
    });

    const flashTimer = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(flashTimer.current), []);
    const showFlash = (text: string, ms = 2000): void => {
        setFlash(text);
        window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setFlash(null), ms);
    };

    // A list pasted in the search goes over the streets from the first one, like a paste in that row (R5-10). The
    // corners keep their names: the first row of the list is Start (Anouk, ronde 5).
    const pasteSummary = usePasteSummary();
    const pasteInSearch = (text: string): boolean => {
        const pasted = pasteNames(session.edition, spaceKey(1), text);
        if (pasted === null) {
            return false;
        }
        session.apply(pasted.changes);
        setQueries((all) => ({ ...all, board: '' }));
        showFlash(pasteSummary(pasted), 3000);
        const first = pasted.keys[0];
        if (first !== undefined) {
            goTo(first);
        }

        return true;
    };

    // Undo and redo show the element they changed and say what came back (UX 7, ronde 3).
    const onHistory = useRef<(event: SessionEvent) => void>(() => undefined);
    const followHistory = (event: SessionEvent): void => {
        if (event.type !== 'history') {
            return;
        }
        const info = describeHistoryStep(event.changes);
        const target = info.target;
        if (target?.kind === 'element') {
            setSelectedKey(target.key);
            setDeedView(target.deed);
            setEditionOpen(false);
        } else if (target?.kind === 'edition') {
            openEdition(target.section);
        }
        const current = session.edition;
        const name =
            info.elementKey === undefined
                ? undefined
                : parseKey(info.elementKey)?.kind === 'group'
                  ? (standardEdition.groups
                        .find(
                            (group) => `group.${group.id}` === info.elementKey,
                        )
                        ?.name[locale].toLowerCase() ?? '')
                  : elementLabel(info.elementKey, current, locale);
        const what =
            name === undefined
                ? info.field === 'name'
                    ? t('editor.history_names', { count: info.count })
                    : t('editor.history_many', { count: info.count })
                : info.field === undefined
                  ? name
                  : t('editor.history_field', {
                        field: t(`editor.history_field_${info.field}`),
                        element: name,
                    });
        showFlash(
            t(
                event.direction === 'undo'
                    ? 'editor.history_undone'
                    : 'editor.history_redone',
                { what },
            ),
            3000,
        );
    };
    useEffect(() => {
        onHistory.current = followHistory;
    });
    useEffect(
        () => session.subscribe((event) => onHistory.current(event)),
        [session],
    );

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

    // A space picked on the board: on a phone it opens, like a row of the list; on a desktop it shows.
    const pickSpace = (next: string): void => {
        if (wide) {
            goTo(next);
            setBigBoard(false);
        } else {
            select(next);
        }
    };

    const swapSpaces = (from: string, to: string): void => {
        session.apply(
            swapChanges(
                session.edition,
                Number(from.slice(6)),
                Number(to.slice(6)),
            ),
        );
    };

    // A photo dragged from one row of the list to another (B238): one undo step, and a line that says what moved.
    const swapPhotos = (from: string, to: string): void => {
        const changes = photoSwapChanges(session.edition, from, to);
        if (changes.length === 0) {
            return;
        }
        const moved = session.edition.elements[to]?.photo === undefined;
        session.apply(changes);
        showFlash(
            t(moved ? 'editor.photo_move_done' : 'editor.photo_swap_done', {
                a: elementLabel(from, edition, locale),
                b: elementLabel(to, edition, locale),
            }),
            3000,
        );
    };

    const openTab = (id: EditorTab): void =>
        goTo(firstKey(id, edition.elements));

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
            // The copy opens with its name ready to change (vindbaarheid point 6).
            router.visit(
                editorShow(
                    { locale, edition: copy.id },
                    { query: { edition: 'general', field: 'edition.name' } },
                ).url,
            );
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

    // Closing Voorbeeld puts the focus back on what opened it, or on a visible Voorbeeld button when that was a menu
    // item or a shortcut (bug 30, B167).
    const previewOpener = useRef<HTMLElement | null>(null);
    const openPreview = (): void => {
        const active = document.activeElement;
        previewOpener.current =
            active instanceof HTMLElement && active !== document.body
                ? active
                : null;
        setPreviewOpen(true);
    };
    const returnFromPreview = (): void => {
        const visible = (node: HTMLElement | null | undefined) =>
            node !== null &&
            node !== undefined &&
            node.isConnected &&
            node.closest('[role="menu"]') === null &&
            node.getClientRects().length > 0;
        const opener = previewOpener.current;
        const target = [
            opener,
            ...document.querySelectorAll<HTMLElement>('[data-preview-toggle]'),
            ...document.querySelectorAll<HTMLElement>(
                'header [aria-haspopup="menu"]',
            ),
        ].find(visible);
        (target ?? opener)?.focus();
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
            check: () => setMessagesOpen((now) => !now),
            focusName: () => {
                // On the phone's overview Enter opens the chosen element, also after J and K (bug 37).
                if (!wide && !mobileElement) {
                    if (editionOpen) {
                        openEdition();
                    } else {
                        select(key);
                    }

                    return;
                }
                const found =
                    focusField('[data-field="name"]') ||
                    focusField('[data-field="text"]');
                if (!found) {
                    // Kans and Algemeen Fonds on the board have no name: say so, and keep the focus in the panel so
                    // the next letters are not shortcuts (bug 43).
                    showFlash(t('editor.no_name_field'), 3000);
                    if (!focusField('[data-field]:not([data-field="photo"])')) {
                        focusField(
                            '[data-editor-panel] button:not([disabled])',
                        );
                    }
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
                showFlash(t('editor.saved_now'));
            },
            print: () => router.visit(printHref),
            help: () => setShortcutsOpen(true),
            preview: openPreview,
            edition: () => openEdition(),
        },
        plainShortcuts,
    );

    // Phone: a switch between the overview and an element moves the focus to the head of the new screen, or back
    // to the chosen row, instead of leaving it on `body` where single letters are shortcuts (bug 16, ronde 3).
    const shownScreen = useRef(mobileElement);
    useEffect(() => {
        if (shownScreen.current === mobileElement) {
            return;
        }
        shownScreen.current = mobileElement;
        if (wide) {
            return;
        }
        const frame = requestAnimationFrame(() => {
            const active = document.activeElement;
            const lost =
                active === null ||
                active === document.body ||
                (active instanceof HTMLElement && active.offsetParent === null);
            if (!lost) {
                return;
            }
            const target = mobileElement
                ? document.querySelector<HTMLElement>('[data-phone-title]')
                : (document.querySelector<HTMLElement>(
                      '[data-scroll-list] [aria-current="true"]',
                  ) ??
                  document.querySelector<HTMLElement>(
                      '[data-key][tabindex="0"]',
                  ));
            target?.focus({ preventScroll: mobileElement });
        });

        return () => cancelAnimationFrame(frame);
    }, [mobileElement, wide]);

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
        // The search field sticks to the top of the list and covers what scrolls under it.
        const sticky =
            list.querySelector<HTMLElement>('[data-list-sticky]')
                ?.offsetHeight ?? 0;
        list.scrollTop += listScrollDelta(
            list.getBoundingClientRect(),
            row.getBoundingClientRect(),
            sticky,
        );
    }, [key]);

    // A tick in front of "Opgeslagen" that people can trust (UX 10, B92); while saving only the word.
    const saved =
        saveState.kind === 'saved-local' ||
        saveState.kind === 'saved-account' ||
        saveState.kind === 'safari-eviction';
    const saveStatus: ReactNode = (
        <>
            {saved && (
                <CheckIcon
                    size={16}
                    data-saved
                    className="mr-1 inline-block -translate-y-px align-middle text-ink"
                />
            )}
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
              hint: t('editor.photo_drag_hint'),
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
                              MAX_ZOOM,
                              Math.max(
                                  minZoom(photo),
                                  photo.scale + 0.1 * direction,
                              ),
                          ),
                      ),
                  ),
          }
        : undefined;

    const menu = {
        onSettings: () => openEdition(),
        // Samen maken is frozen (B202): it stays for an edition that has a box, and is never offered to a new one
        // (R5-16).
        onCollect:
            collect.box === null ? undefined : () => openEdition('together'),
        collectCount: waiting,
        onShortcuts: () => setShortcutsOpen(true),
        onDuplicate: () => void duplicate(),
        onShare: () => setShareOpen(true),
        onPreview: openPreview,
    };

    // Phone, on an element or the edition: one top bar with one back arrow, the name and the menu (§3.6).
    const phoneBar = mobileElement ? (
        <>
            <Button
                variant="icon"
                aria-label={t(
                    editionOpen ? 'editor.back_to_list' : BACK_LABEL[tab],
                )}
                onClick={() => setMobileElement(false)}
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
            printHref={printHref}
            canUndo={canUndo}
            canRedo={canRedo}
            onOpenPreview={openPreview}
            onUndo={() => session.undo()}
            onRedo={() => session.redo()}
            menu={menu}
            phoneBar={phoneBar}
        >
            {/*
                Phone: the list, or the element with its preview on top. A phone on its side puts the preview beside
                the fields. Tablet (B155): the list on the left; the preview, which folds, on top of the panel on the
                right; on a low tablet screen the three side by side. Desktop: list, preview and panel.
            */}
            <div
                data-workspace
                className={cn(
                    'relative flex h-full min-h-0 flex-col',
                    mobileElement &&
                        'phone-low:grid phone-low:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] phone-low:grid-rows-[minmax(0,1fr)_auto]',
                    'md:grid md:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] md:grid-rows-[auto_minmax(0,1fr)]',
                    'tablet-low:grid-cols-[minmax(240px,312px)_minmax(0,1fr)_minmax(300px,340px)] tablet-low:grid-rows-1',
                    'lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)_minmax(320px,380px)] lg:grid-rows-1',
                )}
            >
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

                <nav
                    aria-label={t('editor.parts_nav')}
                    className={cn(
                        'min-h-0 flex-col border-ink md:row-span-2 md:flex md:overflow-clip md:border-r-2 lg:row-span-1 tablet-low:row-span-1',
                        mobileElement ? 'hidden' : 'flex flex-1 overflow-auto',
                    )}
                >
                    {/* A low screen (a phone or tablet on its side) puts Editie, as its stamp, beside the tabs, so the list keeps
                        most of the height (designcheck ronde 5). */}
                    <div
                        data-nav-head
                        className="flex flex-none flex-col gap-3 p-4 pb-3 low:flex-row low:flex-wrap low:items-center low:gap-2 low:px-3 low:py-2"
                    >
                        <p className="m-0 text-sm text-ink-soft xl:hidden low:hidden">
                            {saveStatus}
                        </p>
                        <EditionRow
                            resolved={resolved}
                            interfaceLanguage={locale}
                            selected={editionOpen}
                            onSelect={() => openEdition()}
                        />
                        <Tabs
                            value={editionOpen ? '' : tab}
                            onValueChange={(value) => {
                                const id = tabs.find((item) => item === value);
                                if (id !== undefined) {
                                    openTab(id);
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
                                {tabs.map((id, index) => (
                                    <TabsTrigger
                                        key={id}
                                        value={id}
                                        title={`${t(TAB_LABEL[id])} (${index + 1})`}
                                        aria-keyshortcuts={`${index + 1} Alt+${index + 1}`}
                                        // Radix chooses on mouse down; a click also counts, for a tab that is already
                                        // chosen (back to its first element) and for voice control and screen readers.
                                        onClick={() => openTab(id)}
                                        className="h-auto min-h-12 min-w-0 border-l-2 border-ink px-0.5 py-1 leading-tight first:border-l-0 min-[360px]:px-0.5 min-[360px]:text-sm"
                                    >
                                        <span className="max-w-full truncate">
                                            {t(TAB_LABEL[id])}
                                        </span>
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                        {waiting > 0 && (
                            <FriendsRow count={waiting} onOpen={openFriends} />
                        )}
                        {tab === 'board' && (
                            // On a low screen the list is the way to a space; the board would push it out of sight.
                            // Lower than 900 px it starts folded to one line (vindbaarheid point 16).
                            <Collapsible
                                open={boardShown}
                                onOpenChange={setBoardChoice}
                                className="flex flex-col items-center gap-2 lg:items-start low:hidden"
                            >
                                <CollapsibleTrigger asChild>
                                    <button
                                        type="button"
                                        data-board-fold
                                        className={cn(
                                            'hidden min-h-11 w-full cursor-pointer items-center gap-2 rounded-control border-2 border-ink bg-card px-3 text-left text-sm font-semibold text-ink hover:bg-paper',
                                            (shortScreen || !boardShown) &&
                                                'md:flex',
                                        )}
                                    >
                                        <ChevronDownIcon
                                            size={16}
                                            aria-hidden="true"
                                            className={cn(
                                                'flex-none',
                                                boardShown && 'rotate-180',
                                            )}
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
                                            edition={edition}
                                            interfaceLanguage={locale}
                                            selected={editionOpen ? '' : key}
                                            onSelect={pickSpace}
                                            onMove={goTo}
                                            warned={warned}
                                            onSwap={swapSpaces}
                                            photos={photos}
                                        />
                                        <button
                                            type="button"
                                            data-board-open
                                            tabIndex={-1}
                                            aria-label={t('editor.board_pick')}
                                            onClick={() => setBigBoard(true)}
                                            className="absolute inset-0 z-20 cursor-pointer border-0 bg-transparent lg:hidden"
                                        />
                                    </div>
                                    {/* Off the board, so it never covers a space (bug 11). */}
                                    <Button
                                        variant="secondary"
                                        data-big-board-open
                                        className="max-lg:w-[min(100%,33dvh)]"
                                        onClick={() => setBigBoard(true)}
                                    >
                                        <ZoomIcon size={18} />
                                        {t('editor.board_zoom_in')}
                                    </Button>
                                </CollapsibleContent>
                            </Collapsible>
                        )}
                    </div>

                    <div
                        data-scroll-list
                        {...(tab === 'board' ? listUpload.dropProps : {})}
                        className="flex scroll-pt-14 flex-col px-4 pb-4 md:min-h-0 md:flex-1 md:overflow-auto low:px-3"
                    >
                        {searchable && (
                            <ListSearch
                                tab={tab}
                                value={query}
                                onChange={(next) =>
                                    setQueries((all) => ({
                                        ...all,
                                        [tab]: next,
                                    }))
                                }
                                onPasteLines={
                                    tab === 'board' ? pasteInSearch : undefined
                                }
                                trailing={
                                    tab === 'board' ? (
                                        <ListPhotosButton upload={listUpload} />
                                    ) : undefined
                                }
                            />
                        )}
                        {tab === 'board' && (
                            <div className="flex flex-col gap-2 empty:hidden">
                                <UploadStatus upload={listUpload} />
                                {listUpload.placed?.kind === 'batch' && (
                                    <PlacedList
                                        className="mb-3"
                                        scrollTo="start"
                                        placed={listUpload.placed}
                                        photos={photos}
                                        onUndo={listUpload.undoPlaced}
                                        onClose={listUpload.dismissPlaced}
                                        onMove={listUpload.movePlaced}
                                        onPlaceMissed={(index, element) =>
                                            void listUpload.placeMissed(
                                                index,
                                                element,
                                            )
                                        }
                                    />
                                )}
                            </div>
                        )}
                        {tab === 'board' ? (
                            <BoardList
                                edition={edition}
                                interfaceLanguage={locale}
                                selected={editionOpen ? '' : key}
                                onSelect={select}
                                onFocusRow={goTo}
                                warned={warned}
                                session={session}
                                query={query}
                                onAnnounce={(text) => showFlash(text, 3000)}
                                photos={photos}
                                onSwapPhoto={swapPhotos}
                            />
                        ) : (
                            <ElementList
                                tab={tab}
                                edition={edition}
                                interfaceLanguage={locale}
                                selected={editionOpen ? '' : key}
                                onSelect={select}
                                onFocusRow={goTo}
                                warned={warned}
                                session={session}
                                inSet={inSet}
                                query={searchable ? query : ''}
                                onAnnounce={(text) => showFlash(text, 3000)}
                            />
                        )}
                    </div>
                </nav>

                <section
                    aria-label={t('editor.preview')}
                    data-preview
                    tabIndex={-1}
                    data-folded={folded ? 'true' : undefined}
                    className={cn(
                        'relative min-h-0 flex-col gap-3 p-4 outline-none md:col-start-2 md:row-start-1 md:flex phone-low:col-start-1 phone-low:row-start-1',
                        mobileElement
                            ? cn(
                                  'flex shrink-0 in-data-[keyboard=open]:h-auto in-data-[keyboard=open]:min-h-0',
                                  folded
                                      ? 'h-auto min-h-0'
                                      : editionOpen
                                        ? 'h-[30dvh] max-h-64 min-h-44'
                                        : 'h-[36dvh] max-h-80 min-h-56',
                              )
                            : 'hidden',
                        // A phone on its side: the preview fills the left column next to the fields.
                        'phone-low:h-auto phone-low:max-h-none phone-low:min-h-0 phone-low:p-2',
                        // Tablet: on top of the panel, a third of the screen at most.
                        'tablet-tall:max-h-none tablet-tall:border-b-2 tablet-tall:border-ink',
                        folded
                            ? // Folded: only the bar that brings it back (phone and tablet).
                              'gap-0 border-b-2 border-ink bg-card p-0 tablet-tall:h-auto tablet-tall:min-h-0 [&>*:not([data-fold])]:hidden'
                            : 'tablet-tall:h-[min(36dvh,24rem)] tablet-tall:min-h-56',
                        // A low tablet screen (a big phone on its side): the preview in the middle column.
                        'tablet-low:h-auto tablet-low:max-h-none tablet-low:min-h-0 tablet-low:p-2',
                        'lg:col-start-2 lg:row-start-1 lg:h-auto lg:max-h-none lg:min-h-0',
                    )}
                >
                    {/* Phone and tablet upright: a bar under the preview folds it to one line and brings it back. It
                        sits in the flow under the hints, never on top of them (bug 29, UX 5). */}
                    {foldable && (
                        <button
                            type="button"
                            aria-expanded={!folded}
                            onClick={togglePreview}
                            data-fold
                            className={cn(
                                'order-last flex min-h-11 w-full flex-none cursor-pointer items-center gap-2 border-0 text-sm font-semibold text-ink',
                                folded
                                    ? 'bg-card px-4 text-left'
                                    : '-mx-4 -mb-4 w-[calc(100%+2rem)] justify-center border-t border-line bg-paper/70',
                            )}
                        >
                            <ChevronDownIcon
                                size={16}
                                aria-hidden="true"
                                className={cn(
                                    'flex-none',
                                    !folded && 'rotate-180',
                                )}
                            />
                            {folded ? (
                                <>
                                    <span className="flex-none">
                                        {t('editor.preview_show')}
                                    </span>
                                    <span className="min-w-0 truncate font-normal text-ink-soft">
                                        {label}
                                    </span>
                                </>
                            ) : (
                                t('editor.preview_fold')
                            )}
                        </button>
                    )}
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
                                <SegmentedTabsTrigger
                                    value="deed"
                                    aria-label={t('editor.view_deed')}
                                >
                                    {/* The middle column of a small desktop is narrow: a short word there (bug 39). */}
                                    <span className="lg:max-xl:hidden phone-low:hidden tablet-low:hidden">
                                        {t('editor.view_deed')}
                                    </span>
                                    <span
                                        aria-hidden="true"
                                        className="hidden lg:max-xl:inline phone-low:inline tablet-low:inline"
                                    >
                                        {t('editor.view_deed_short')}
                                    </span>
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
                                                  : // The lid shows where its own text is once it has layers (bug 36).
                                                    editKind === 'boxLid' &&
                                                      layers.length > 0
                                                    ? lidZones(edition)
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
                    onScrollCapture={onFieldsScroll}
                    className={cn(
                        'min-h-0 flex-col border-ink bg-card md:col-start-2 md:row-start-2 md:flex lg:col-start-3 lg:row-start-1 lg:border-l-2 phone-low:col-start-2 phone-low:row-start-1 phone-low:border-l-2 tablet-low:col-start-3 tablet-low:row-start-1 tablet-low:border-l-2',
                        editionOpen ? 'md:overflow-clip' : 'md:overflow-auto',
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
                    className="flex flex-none items-center gap-1.5 border-t-2 border-ink bg-card p-2 pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] min-[380px]:gap-2 md:hidden phone-low:col-span-2 phone-low:py-1"
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
                            data-preview-toggle
                            onClick={openPreview}
                        >
                            {t('editor.preview_button')}
                        </Button>
                    )}
                </nav>
            </div>

            {probe}

            <BigBoard
                open={bigBoard}
                onOpenChange={setBigBoard}
                edition={edition}
                interfaceLanguage={locale}
                selected={editionOpen || tab !== 'board' ? 'space.00' : key}
                warned={warned}
                onPick={pickSpace}
                onSwap={swapSpaces}
                photos={photos}
            />
            <PreviewDialog
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                onClosed={returnFromPreview}
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
            <OpenMessages
                open={messagesOpen}
                onOpenChange={setMessagesOpen}
                issues={issues}
                edition={edition}
                locale={locale}
                onOpen={openFromCheck}
            />
            <ShareBoardDialog
                open={shareOpen}
                onOpenChange={setShareOpen}
                edition={stored}
                getPhoto={(id) => repository.getPhoto(id)}
            />
            <ShortcutsDialog
                open={shortcutsOpen}
                onOpenChange={setShortcutsOpen}
                plain={plainShortcuts}
                tabNames={tabs.map((id) => t(TAB_LABEL[id]))}
                onPlainChange={(next) => {
                    setPlainShortcuts(next);
                    writePlainEnabled(next);
                }}
            />
            <p
                role="status"
                className={cn(
                    'pointer-events-none fixed bottom-24 left-1/2 z-50 m-0 -translate-x-1/2 rounded-control border-2 border-ink bg-ink px-4 py-2 text-sm font-semibold text-paper transition-opacity motion-reduce:transition-none md:bottom-6',
                    flash !== null ? 'opacity-100' : 'opacity-0',
                )}
            >
                {flash ?? ''}
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
