import { readStartRequest, shownFor } from './start-request';

const at = (search: string) => {
    window.history.replaceState(null, '', `/nl/editor/abc${search}`);
};

afterEach(() => at(''));

describe('shownFor', () => {
    it('shows an element where it is', () => {
        expect(shownFor('card.chance.03')).toEqual({
            key: 'card.chance.03',
            deed: false,
        });
    });

    it('shows a deed on its space, and keeps a key that is no deed', () => {
        expect(shownFor('deed.01')).toEqual({ key: 'space.01', deed: true });
        expect(shownFor('deed.99')).toEqual({
            key: 'deed.99',
            deed: false,
        });
    });
});

describe('readStartRequest', () => {
    it('reads nothing from a plain address', () => {
        at('?other=1');

        expect(readStartRequest()).toEqual({
            messages: false,
            element: undefined,
            section: undefined,
            sectionField: undefined,
        });
        expect(window.location.search).toBe('?other=1');
    });

    it('reads the messages, an element and its field, and takes them off the address', () => {
        at('?check=1&element=card.chance.03&field=photo&other=1');

        expect(readStartRequest()).toEqual({
            messages: true,
            element: { key: 'card.chance.03', field: 'photo' },
            section: undefined,
            sectionField: undefined,
        });
        expect(window.location.search).toBe('?other=1');
    });

    it('reads a section with the field to focus, and skips an unknown element', () => {
        at('?edition=general&field=edition.name');

        expect(readStartRequest()).toEqual({
            messages: false,
            element: undefined,
            section: 'general',
            sectionField: 'edition.name',
        });

        at('?element=nonsense');

        expect(readStartRequest().element).toBeUndefined();
        expect(window.location.search).toBe('');
    });
});
