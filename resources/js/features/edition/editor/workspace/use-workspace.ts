import { previewSize } from '@/components/render/editor-element-preview';
import {
    kindLine,
    useElementStatus,
} from '@/features/edition/editor/element-panel';
import { lookupResolved } from '@/features/edition/editor/lookup';
import { useElementActions } from '@/features/edition/editor/panel/panel-header';
import { usePhotoUpload } from '@/features/edition/editor/panel/use-photo-upload';
import { usePhotoGestures } from '@/features/edition/editor/workspace/use-photo-gestures';
import {
    useChosenInView,
    useFocusRequest,
    usePhoneScreenFocus,
} from '@/features/edition/editor/workspace/use-workspace-focus';
import { useWorkspaceState } from '@/features/edition/editor/workspace/use-workspace-state';
import { workspaceView } from '@/features/edition/editor/workspace/workspace-view';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { elementLabel, firstKey, tabKeys } from '@/lib/render/editor-catalogue';
import { print as editionsPrint } from '@/routes/editions';

const titles = (
    { data, navigation }: ReturnType<typeof useWorkspaceState>,
    key: string,
    t: ReturnType<typeof useTranslation>,
) => {
    const { edition, resolved, locale } = data;

    return {
        label: navigation.editionOpen
            ? t('editor.edition_row')
            : elementLabel(key, edition, locale),
        subtitle: navigation.editionOpen
            ? t('edition_panel.kind')
            : kindLine(key, edition, resolved, t, locale),
        printHref: editionsPrint({ locale, edition: edition.id }).url,
    };
};

export const useWorkspace = (session: EditionSession) => {
    const t = useTranslation();
    const state = useWorkspaceState(session);
    const { data, navigation, navigate } = state;
    const { edition, resolved, locale, photos } = data;
    const view = workspaceView(navigation, edition);
    const { key, tab, editKey } = view;
    const { editionOpen } = navigation;
    const layerId = state.layerSel.key === editKey ? state.layerSel.id : null;
    const layers = edition.elements[editKey]?.layers ?? [];
    const part = editionOpen ? undefined : lookupResolved(resolved, editKey);
    const size = previewSize(view.target, edition);
    const photo = usePhotoGestures({
        session,
        editKey,
        targetKey: view.target.key,
        part,
        photos,
        boardProfile: edition.boardProfile,
    });
    // "Foto's" next to the search of the board list (B237): many photos at once, each on the space of its name.
    const listUpload = usePhotoUpload({
        session,
        edition,
        editKey: null,
        cache: data.cache,
        siblings: [],
        canHold: true,
        labelOf: (element) => elementLabel(element, edition, locale),
        pasteShortcut: false,
    });
    const tabKeyList = tabKeys(tab, edition.elements);
    const editLabel = elementLabel(editKey, edition, locale);

    // After a pawn or an extra card left the set: the same place when a later card moved up, else the one before.
    const leaveRemoved = (): void => {
        const { elements } = session.edition;
        const list = tabKeys(tab, elements);
        const before = Math.max(0, tabKeyList.indexOf(key) - 1);
        navigate({
            type: 'leave',
            key: list.includes(key)
                ? key
                : (list[before] ?? firstKey(tab, elements) ?? 'space.01'),
        });
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

    useFocusRequest(navigation.focusRequest);
    usePhoneScreenFocus(navigation.mobileElement, state.wide);
    useChosenInView(key);

    return {
        ...state,
        session,
        view,
        layerId,
        layers,
        size,
        photo,
        listUpload,
        tabKeyList,
        editLabel,
        leaveRemoved,
        elementStatus,
        elementActions,
        query: state.queries[tab] ?? '',
        ...titles(state, key, t),
    };
};

export type Workspace = ReturnType<typeof useWorkspace>;
