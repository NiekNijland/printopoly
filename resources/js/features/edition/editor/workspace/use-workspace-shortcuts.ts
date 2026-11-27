import { router } from '@inertiajs/react';

import { useEditorShortcuts } from '@/features/edition/editor/use-editor-shortcuts';
import type { Workspace } from '@/features/edition/editor/workspace/use-workspace';
import type { WorkspaceCommands } from '@/features/edition/editor/workspace/use-workspace-commands';
import { focusField } from '@/features/edition/editor/workspace/use-workspace-focus';
import { useTranslation } from '@/hooks/use-translation';
import { EDITOR_TABS } from '@/lib/render/editor-catalogue';

const photoKeys = (ws: Workspace) => {
    const { act, photo, zoomText } = ws.photo;

    return {
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
    };
};

export const useWorkspaceShortcuts = (
    ws: Workspace,
    commands: WorkspaceCommands,
): void => {
    const t = useTranslation();
    const { navigation, dialogs, session, showFlash } = ws;

    useEditorShortcuts(
        {
            next: () => commands.step(1),
            previous: () => commands.step(-1),
            tab: (index) => {
                const id = EDITOR_TABS[index];
                if (id !== undefined) {
                    commands.openTab(id);
                }
            },
            check: () => dialogs.setMessagesOpen((now) => !now),
            focusName: () => {
                // On the phone's overview Enter opens the chosen element, also after J and K (bug 37).
                if (!ws.wide && !navigation.mobileElement) {
                    if (navigation.editionOpen) {
                        commands.openEdition();
                    } else {
                        commands.select(ws.view.key);
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
            ...photoKeys(ws),
            save: () => {
                void session.flush();
                showFlash(t('editor.saved_now'));
            },
            print: () => router.visit(ws.printHref),
            help: () => dialogs.setShortcutsOpen(true),
            preview: commands.openPreview,
            edition: () => commands.openEdition(),
        },
        dialogs.plainShortcuts,
    );
};
