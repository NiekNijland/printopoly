import { router } from '@inertiajs/react';

import { nextContributionElement } from '@/features/edition/boxes/proposals';
import { createAccountActions } from '@/features/edition/editor/account-actions';
import { pasteNames } from '@/features/edition/editor/name-list';
import { usePasteSummary } from '@/features/edition/editor/name-row';
import {
    historyStep,
    useFollowHistory,
} from '@/features/edition/editor/workspace/use-follow-history';
import type { Workspace } from '@/features/edition/editor/workspace/use-workspace';
import { usePreviewReturn } from '@/features/edition/editor/workspace/use-workspace-focus';
import type { WorkspaceMenu } from '@/features/edition/editor/workspace/workspace-chrome';
import { createRemoteEditionStore } from '@/features/edition/remote/store';
import { useTranslation } from '@/hooks/use-translation';
import { spaceKey } from '@/lib/render/edition-keys';
import {
    BOARD_ORDER,
    elementLabel,
    firstKey,
    stepKey,
    type EditorTab,
} from '@/lib/render/editor-catalogue';
import {
    canClearNames,
    clearNamesChanges,
    clearNamesDone,
    ownNameKeys,
} from '@/lib/render/editor-clear-names';
import type { EditionSection } from '@/lib/render/editor-edition-panel';
import { photoSwapChanges } from '@/lib/render/editor-photo-swap';
import { swapChanges } from '@/lib/render/editor-swap';
import { uploadAccountPhoto } from '@/lib/render/print-api';
import { show as editorShow } from '@/routes/editor';

const useMoves = (ws: Workspace) => {
    const { navigate, view, session } = ws;
    const goTo = (next: string | undefined): void => {
        if (next !== undefined) {
            navigate({ type: 'go-to', key: next });
        }
    };

    return {
        goTo,
        select: (next: string): void => navigate({ type: 'select', key: next }),
        /** Shows the edition panel (B145), at a section when one is asked for. */
        openEdition: (section: EditionSection = 'general'): void =>
            navigate({ type: 'open-edition', section }),
        step: (direction: 1 | -1): void =>
            goTo(
                stepKey(
                    view.tab === 'board' ? BOARD_ORDER : ws.tabKeyList,
                    view.key,
                    direction,
                ),
            ),
        openTab: (id: EditorTab): void =>
            goTo(firstKey(id, ws.data.edition.elements)),
        pickSpace: (next: string): void =>
            navigate({ type: 'pick-space', key: next, wide: ws.wide }),
        swapSpaces: (from: string, to: string): void => {
            session.apply(
                swapChanges(
                    session.edition,
                    Number(from.slice(6)),
                    Number(to.slice(6)),
                ),
            );
        },
    };
};

const useEditionActions = (ws: Workspace) => {
    const { session, data, setDuplicateFailed } = ws;
    const { edition, locale, auth, repository } = data;

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

    return { duplicate };
};

const workspaceMenu = (
    ws: Workspace,
    openEdition: (section?: EditionSection) => void,
    duplicate: () => Promise<void>,
    openPreview: () => void,
    t: ReturnType<typeof useTranslation>,
): WorkspaceMenu => {
    const { session, data, dialogs, showFlash } = ws;
    const { edition } = data;

    return {
        onSettings: () => openEdition(),
        // Samen maken is frozen (B202): it stays for an edition that has a box, and is never offered to a new one
        // (R5-16).
        onCollect:
            data.collect.box === null
                ? undefined
                : () => openEdition('together'),
        collectCount: data.contributions.length,
        onShortcuts: () => dialogs.setShortcutsOpen(true),
        onDuplicate: () => void duplicate(),
        onShare: () => dialogs.setShareOpen(true),
        onPreview: openPreview,
        // One undo step brings every name back; names you typed stay (B201, B258).
        onClearNames: canClearNames(edition)
            ? () => {
                  const kept = ownNameKeys(session.edition).length;
                  session.apply(clearNamesChanges(session.edition));
                  showFlash(clearNamesDone(t, kept), 5000);
              }
            : undefined,
    };
};

export const useWorkspaceCommands = (ws: Workspace) => {
    const t = useTranslation();
    const { session, data, navigate, dialogs, showFlash } = ws;
    const { edition, locale } = data;
    const moves = useMoves(ws);
    const { duplicate } = useEditionActions(ws);
    const preview = usePreviewReturn(() => dialogs.setPreviewOpen(true));

    // A list pasted in the search goes over the streets from the first one, like a paste in that row (R5-10). The
    // corners keep their names: the first row of the list is Start (Anouk, ronde 5).
    const pasteSummary = usePasteSummary();
    const pasteInSearch = (text: string): boolean => {
        const pasted = pasteNames(session.edition, spaceKey(1), text);
        if (pasted === null) {
            return false;
        }
        session.apply(pasted.changes);
        ws.setQueries((all) => ({ ...all, board: '' }));
        showFlash(pasteSummary(pasted), 3000);
        moves.goTo(pasted.keys[0]);

        return true;
    };

    useFollowHistory(session, (event) => {
        if (event.type !== 'history') {
            return;
        }
        const step = historyStep(
            event.changes,
            event.direction,
            session.edition,
            locale,
            t,
        );
        if (step.action !== undefined) {
            navigate(step.action);
        }
        showFlash(step.text, 3000);
    });

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

    const openFriends = (): void => {
        // Each press goes to the next element with something waiting (bug 30); new cards wait in Samen maken.
        const next = nextContributionElement(
            data.contributions.filter((item) => item.open.length > 0),
            ws.navigation.editionOpen ? '' : ws.view.key,
        );
        if (next === undefined) {
            moves.openEdition('together');
        } else {
            moves.select(next);
        }
    };

    const menu = workspaceMenu(
        ws,
        moves.openEdition,
        duplicate,
        preview.openPreview,
        t,
    );

    return {
        ...moves,
        ...preview,
        pasteInSearch,
        swapPhotos,
        openFriends,
        menu,
    };
};

export type WorkspaceCommands = ReturnType<typeof useWorkspaceCommands>;

export type WorkspaceParts = { ws: Workspace; commands: WorkspaceCommands };
