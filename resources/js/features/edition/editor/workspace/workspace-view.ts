import type { NavigationState } from '@/features/edition/editor/workspace/navigation';
import {
    ALLOWED_FIELDS,
    THEME_ACCENT_KEY,
    parseKey,
    type ElementKind,
} from '@/lib/render/edition-keys';
import type { Edition } from '@/lib/render/edition-types';
import {
    deedKeyForSpace,
    spacePosition,
    tabKeys,
    tabOfKey,
    type EditorTab,
} from '@/lib/render/editor-catalogue';

export type WorkspaceView = {
    key: string;
    tab: EditorTab;
    deedKey: string | undefined;
    showDeed: boolean;
    editKey: string;
    target: { key: string; deed?: boolean };
    editKind: ElementKind | undefined;
    hasLayers: boolean;
    onBoard: boolean;
};

export const workspaceView = (
    navigation: Pick<
        NavigationState,
        'selectedKey' | 'deedView' | 'editionOpen'
    >,
    edition: Edition,
): WorkspaceView => {
    const { selectedKey, deedView, editionOpen } = navigation;
    // A key that left its tab (a removed pawn or card) falls back to the board.
    const valid = tabKeys(tabOfKey(selectedKey), edition.elements).includes(
        selectedKey,
    );
    const key = valid ? selectedKey : 'space.01';
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

    return {
        key,
        tab: tabOfKey(key),
        deedKey,
        showDeed,
        editKey,
        target,
        editKind,
        // A card back keeps no free layers (B203).
        hasLayers:
            editKind !== undefined &&
            editKind !== 'cardBack' &&
            ALLOWED_FIELDS[editKind].includes('layers'),
        // A space or the centre stands in the faded rest of the board, so it reads as a piece of it (Niek, 24 nov).
        onBoard:
            target.deed !== true &&
            (editKind === 'space' || editKind === 'boardCenter'),
    };
};
