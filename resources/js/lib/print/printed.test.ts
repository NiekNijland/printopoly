import { markPrinted, printedState, readPrinted } from './printed';

describe('printed editions (R6 Kees, B260)', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('says never, printed, or changed after printing', () => {
        expect(printedState(readPrinted(), 'e1', 3)).toEqual({
            kind: 'never',
        });

        markPrinted('e1', { at: 100, revision: 3 });

        expect(printedState(readPrinted(), 'e1', 3)).toEqual({
            kind: 'printed',
            at: 100,
        });
        expect(printedState(readPrinted(), 'e1', 4)).toEqual({
            kind: 'changed',
            at: 100,
        });
        expect(printedState(readPrinted(), 'e2', 1).kind).toBe('never');
    });

    it('keeps the first moment for a revision and moves on with a newer one', () => {
        markPrinted('e1', { at: 100, revision: 3 });
        markPrinted('e1', { at: 200, revision: 3 });
        expect(readPrinted()['e1']).toEqual({ at: 100, revision: 3 });

        markPrinted('e1', { at: 300, revision: 5 });
        expect(readPrinted()['e1']).toEqual({ at: 300, revision: 5 });
    });

    it('ignores what it cannot read', () => {
        window.localStorage.setItem(
            'printopoly.printed',
            JSON.stringify({ e1: { at: 'x' }, e2: { at: 1, revision: 2 } }),
        );
        expect(readPrinted()).toEqual({ e2: { at: 1, revision: 2 } });

        window.localStorage.setItem('printopoly.printed', '{broken');
        expect(readPrinted()).toEqual({});
    });
});
