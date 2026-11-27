import {
    navigationReducer,
    selectedBy,
    startNavigation,
    type NavigationState,
} from './navigation';

const state = (extra: Partial<NavigationState> = {}): NavigationState => ({
    selectedKey: 'space.01',
    deedView: false,
    editionOpen: false,
    mobileElement: false,
    bigBoard: false,
    sectionRequest: null,
    focusRequest: null,
    ...extra,
});

describe('startNavigation', () => {
    it('starts on the first space with nothing open', () => {
        expect(startNavigation({ messages: false })).toEqual(state());
    });

    it('opens an element from the address with the focus on its field', () => {
        expect(
            startNavigation({
                messages: false,
                element: { key: 'card.chance.03', field: 'text' },
            }),
        ).toEqual(
            state({
                selectedKey: 'card.chance.03',
                mobileElement: true,
                focusRequest: { n: 1, field: 'text' },
            }),
        );
    });

    it('shows a deed on its space and sends a layer field to the photo', () => {
        const start = startNavigation({
            messages: false,
            element: { key: 'deed.01', field: 'layer.abc' },
        });

        expect(start.selectedKey).toBe('space.01');
        expect(start.deedView).toBe(true);
        expect(start.focusRequest).toEqual({ n: 1, field: 'photo' });
    });

    it('opens the edition panel at the section of a word key', () => {
        expect(
            startNavigation({
                messages: false,
                element: { key: 'words.house', field: 'value' },
            }),
        ).toEqual(
            state({
                editionOpen: true,
                mobileElement: true,
                sectionRequest: { section: 'words', n: 1 },
                focusRequest: { n: 1, field: 'words.house.value' },
            }),
        );
    });

    it('opens a section with the field to focus after Dupliceren', () => {
        expect(
            startNavigation({
                messages: true,
                section: 'general',
                sectionField: 'edition.name',
            }),
        ).toEqual(
            state({
                editionOpen: true,
                mobileElement: true,
                sectionRequest: { section: 'general', n: 1 },
                focusRequest: { n: 1, field: 'edition.name' },
            }),
        );
    });
});

describe('navigationReducer', () => {
    it('selects an element like a row of the list: it opens on a phone and closes the edition', () => {
        expect(
            navigationReducer(
                state({ editionOpen: true, bigBoard: true, deedView: true }),
                { type: 'select', key: 'space.05' },
            ),
        ).toEqual(state({ selectedKey: 'space.05', mobileElement: true }));
    });

    it('selects a space with its deed shown', () => {
        expect(
            navigationReducer(state(), {
                type: 'select',
                key: 'space.01',
                deed: true,
            }),
        ).toMatchObject({ selectedKey: 'space.01', deedView: true });
    });

    it('goes to an element without opening the phone screen', () => {
        expect(
            navigationReducer(state({ editionOpen: true, deedView: true }), {
                type: 'go-to',
                key: 'card.chest.02',
            }),
        ).toEqual(state({ selectedKey: 'card.chest.02' }));
        expect(
            navigationReducer(state(), {
                type: 'go-to',
                key: 'space.01',
                deed: true,
            }),
        ).toEqual(state({ selectedKey: 'space.01', deedView: true }));
    });

    it('leaves a removed element for another and keeps the edition as it was', () => {
        expect(
            navigationReducer(state({ deedView: true, mobileElement: true }), {
                type: 'leave',
                key: 'pawn.02',
            }),
        ).toEqual(state({ selectedKey: 'pawn.02', mobileElement: true }));
    });

    it('picks a space on a desktop without opening the phone screen, and closes the big board', () => {
        expect(
            navigationReducer(state({ bigBoard: true, editionOpen: true }), {
                type: 'pick-space',
                key: 'space.07',
                wide: true,
            }),
        ).toEqual(state({ selectedKey: 'space.07' }));
        expect(
            navigationReducer(state({ bigBoard: true }), {
                type: 'pick-space',
                key: 'space.07',
                wide: false,
            }),
        ).toEqual(state({ selectedKey: 'space.07', mobileElement: true }));
    });

    it('opens the edition at a section, counting each request', () => {
        const first = navigationReducer(state(), {
            type: 'open-edition',
            section: 'words',
        });
        const second = navigationReducer(first, {
            type: 'open-edition',
            section: 'words',
        });

        expect(first).toEqual(
            state({
                editionOpen: true,
                mobileElement: true,
                sectionRequest: { section: 'words', n: 1 },
            }),
        );
        expect(second.sectionRequest).toEqual({ section: 'words', n: 2 });
    });

    it('opens a message of an element at its field', () => {
        expect(
            navigationReducer(state({ focusRequest: { n: 2, field: 'x' } }), {
                type: 'open-from-check',
                key: 'deed.01',
                field: 'layer.1',
            }),
        ).toEqual(
            state({
                selectedKey: 'space.01',
                deedView: true,
                mobileElement: true,
                focusRequest: { n: 3, field: 'photo' },
            }),
        );
    });

    it('opens a message of the edition in its section', () => {
        expect(
            navigationReducer(state(), {
                type: 'open-from-check',
                key: 'words.house',
                field: 'value',
            }),
        ).toEqual(
            state({
                editionOpen: true,
                mobileElement: true,
                sectionRequest: { section: 'words', n: 1 },
                focusRequest: { n: 1, field: 'words.house.value' },
            }),
        );
    });

    it('asks for the focus, switches the deed view, closes the element and opens the big board', () => {
        const focused = navigationReducer(state(), {
            type: 'request-focus',
            field: 'name',
        });
        const deed = navigationReducer(focused, {
            type: 'deed-view',
            deed: true,
        });
        const closed = navigationReducer(
            { ...deed, mobileElement: true },
            { type: 'close-element' },
        );
        const board = navigationReducer(closed, {
            type: 'big-board',
            open: true,
        });

        expect(board).toEqual(
            state({
                focusRequest: { n: 1, field: 'name' },
                deedView: true,
                bigBoard: true,
            }),
        );
    });
});

describe('selectedBy', () => {
    it('names the key an action chooses like a row of the list', () => {
        expect(selectedBy({ type: 'select', key: 'space.03' })).toBe(
            'space.03',
        );
        expect(
            selectedBy({ type: 'pick-space', key: 'space.03', wide: false }),
        ).toBe('space.03');
        expect(
            selectedBy({ type: 'pick-space', key: 'space.03', wide: true }),
        ).toBeUndefined();
        expect(
            selectedBy({
                type: 'open-from-check',
                key: 'deed.01',
                field: 'name',
            }),
        ).toBe('space.01');
        expect(
            selectedBy({
                type: 'open-from-check',
                key: 'words.house',
                field: 'value',
            }),
        ).toBeUndefined();
        expect(selectedBy({ type: 'go-to', key: 'space.03' })).toBeUndefined();
    });
});
