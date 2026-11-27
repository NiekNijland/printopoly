import { sampleEdition } from '@/testing/editions';

import { workspaceView } from './workspace-view';

const view = (
    selectedKey: string,
    extra: { deedView?: boolean; editionOpen?: boolean } = {},
) =>
    workspaceView(
        {
            selectedKey,
            deedView: extra.deedView ?? false,
            editionOpen: extra.editionOpen ?? false,
        },
        sampleEdition(),
    );

describe('workspaceView', () => {
    it('shows a street on the board with its deed to switch to', () => {
        expect(view('space.01')).toEqual({
            key: 'space.01',
            tab: 'board',
            deedKey: 'deed.01',
            showDeed: false,
            editKey: 'space.01',
            target: { key: 'space.01', deed: false },
            editKind: 'space',
            hasLayers: false,
            onBoard: true,
        });
    });

    it('edits the deed of a street when the deed is shown', () => {
        expect(view('space.01', { deedView: true })).toMatchObject({
            showDeed: true,
            editKey: 'deed.01',
            target: { key: 'space.01', deed: true },
            editKind: 'deed',
            onBoard: false,
        });
    });

    it('shows the whole board for the edition', () => {
        expect(
            view('space.01', { deedView: true, editionOpen: true }),
        ).toMatchObject({
            showDeed: false,
            editKey: 'space.01',
            target: { key: 'theme_accent' },
            editKind: undefined,
            hasLayers: false,
            onBoard: false,
        });
    });

    it('falls back to the first space for a key that left its tab', () => {
        expect(view('pawn.99')).toMatchObject({
            key: 'space.01',
            tab: 'board',
        });
    });

    it('gives the board centre free layers', () => {
        expect(view('board_center')).toMatchObject({
            editKind: 'boardCenter',
            hasLayers: true,
            onBoard: true,
        });
    });

    it('keeps free layers off a card back', () => {
        expect(view('card_back.chance')).toMatchObject({
            editKind: 'cardBack',
            hasLayers: false,
            onBoard: false,
        });
    });
});
