import { useState } from 'react';

import { readPlainEnabled } from '@/features/edition/editor/shortcuts';
import { readStartRequest } from '@/features/edition/editor/workspace/start-request';
import { useFlash } from '@/features/edition/editor/workspace/use-flash';
import { usePreviewFold } from '@/features/edition/editor/workspace/use-preview-fold';
import { useWorkspaceData } from '@/features/edition/editor/workspace/use-workspace-data';
import { useWorkspaceNavigation } from '@/features/edition/editor/workspace/use-workspace-navigation';
import type { EditionSession } from '@/features/edition/session';
import { useBackCloses } from '@/hooks/use-back-closes';
import { useShortScreen, useWideScreen } from '@/hooks/use-media-query';
import type { EditorTab } from '@/lib/render/editor-catalogue';

export const useBoardFold = () => {
    // The small board folds to one line on a screen lower than 900 px (vindbaarheid point 16), until opened.
    const shortScreen = useShortScreen();
    const [boardChoice, setBoardChoice] = useState<boolean | null>(null);

    return {
        shortScreen,
        shown: boardChoice ?? !shortScreen,
        onShownChange: setBoardChoice,
    };
};

export type BoardFold = ReturnType<typeof useBoardFold>;

const useDialogs = (messages: boolean) => {
    // The open messages, behind the key C (B197); no button or counter while you work.
    const [messagesOpen, setMessagesOpen] = useState(messages);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [plainShortcuts, setPlainShortcuts] = useState(readPlainEnabled);

    return {
        messagesOpen,
        setMessagesOpen,
        shortcutsOpen,
        setShortcutsOpen,
        shareOpen,
        setShareOpen,
        previewOpen,
        setPreviewOpen,
        plainShortcuts,
        setPlainShortcuts,
    };
};

export const useWorkspaceState = (session: EditionSession) => {
    const data = useWorkspaceData(session);
    // Read once: the print page sends people here to a message, a field or a section (B197).
    const [start] = useState(readStartRequest);
    const { navigation, navigate } = useWorkspaceNavigation(start, () =>
        data.decision.clear(),
    );
    const dialogs = useDialogs(start.messages);
    const fold = usePreviewFold();
    const boardFold = useBoardFold();
    // Two or three columns, or one screen at a time on a phone (below 768 px, B155).
    const wide = useWideScreen();
    // The back button of a phone closes what lies open first, the element screen last (R5-14).
    useBackCloses(!wide && navigation.mobileElement, () =>
        navigate({ type: 'close-element' }),
    );
    useBackCloses(navigation.bigBoard, () =>
        navigate({ type: 'big-board', open: false }),
    );
    useBackCloses(dialogs.previewOpen, () => dialogs.setPreviewOpen(false));
    useBackCloses(dialogs.shareOpen, () => dialogs.setShareOpen(false));
    useBackCloses(dialogs.shortcutsOpen, () => dialogs.setShortcutsOpen(false));
    useBackCloses(dialogs.messagesOpen, () => dialogs.setMessagesOpen(false));
    const [duplicateFailed, setDuplicateFailed] = useState(false);
    const [layerSel, setLayerSel] = useState<{
        key: string;
        id: string | null;
    }>({ key: '', id: null });
    const [queries, setQueries] = useState<Partial<Record<EditorTab, string>>>(
        {},
    );
    const flash = useFlash();

    return {
        data,
        navigation,
        navigate,
        dialogs,
        fold,
        boardFold,
        wide,
        duplicateFailed,
        setDuplicateFailed,
        layerSel,
        setLayerSel,
        queries,
        setQueries,
        ...flash,
    };
};

export type WorkspaceState = ReturnType<typeof useWorkspaceState>;
