import { describe, expect, it } from 'vitest';
import { setElement, updateElement } from './changes';
import {
    canRedo,
    canUndo,
    createHistory,
    record,
    redo,
    undo,
    type History,
} from './history';
import { makeEdition } from './test-utils';
import type { Edition, ElementChange } from './types';

function edit(
    edition: Edition,
    history: History,
    key: string,
    name: string,
    group: string | null = null,
) {
    const { edition: next, change } = updateElement(edition, key, { name });
    const changes: ElementChange[] = change === null ? [] : [change];

    return { edition: next, history: record(history, changes, group) };
}

describe('undo and redo', () => {
    it('goes back and forth over element changes', () => {
        let state = { edition: makeEdition(), history: createHistory() };
        state = edit(state.edition, state.history, 'space.01', 'A');
        state = edit(state.edition, state.history, 'space.03', 'B');
        expect(canUndo(state.history)).toBe(true);
        expect(canRedo(state.history)).toBe(false);

        const first = undo(state.history, state.edition);
        expect(first.edition.elements['space.03']).toBeUndefined();
        expect(first.edition.elements['space.01']).toEqual({ name: 'A' });
        expect(canRedo(first.history)).toBe(true);

        const second = undo(first.history, first.edition);
        expect(second.edition.elements).toEqual({});
        expect(undo(second.history, second.edition).changes).toEqual([]);

        const again = redo(second.history, second.edition);
        expect(again.edition.elements['space.01']).toEqual({ name: 'A' });
        const last = redo(again.history, again.edition);
        expect(last.edition).toEqual(state.edition);
        expect(redo(last.history, last.edition).changes).toEqual([]);
    });

    it('clears the redo stack on a new change', () => {
        let state = { edition: makeEdition(), history: createHistory() };
        state = edit(state.edition, state.history, 'space.01', 'A');
        const undone = undo(state.history, state.edition);
        const next = edit(undone.edition, undone.history, 'space.03', 'B');
        expect(canRedo(next.history)).toBe(false);
    });

    it('merges changes of the same group into one step', () => {
        let state = { edition: makeEdition(), history: createHistory() };
        for (const name of ['S', 'St', 'Sta', 'Stad']) {
            state = edit(
                state.edition,
                state.history,
                'space.01',
                name,
                'type:space.01',
            );
        }
        expect(state.history.past).toHaveLength(1);
        const undone = undo(state.history, state.edition);
        expect(undone.edition.elements).toEqual({});
        expect(
            redo(undone.history, undone.edition).edition.elements['space.01'],
        ).toEqual({ name: 'Stad' });
    });

    it('does not merge different groups or no group', () => {
        let state = { edition: makeEdition(), history: createHistory() };
        state = edit(state.edition, state.history, 'space.01', 'A', 'a');
        state = edit(state.edition, state.history, 'space.01', 'B', 'b');
        state = edit(state.edition, state.history, 'space.01', 'C');
        state = edit(state.edition, state.history, 'space.01', 'D');
        expect(state.history.past).toHaveLength(4);
    });

    it('ignores empty change lists', () => {
        const history = createHistory();
        expect(record(history, [])).toBe(history);
    });

    it('keeps at most `cap` steps, dropping the oldest', () => {
        let state = { edition: makeEdition(), history: createHistory(3) };
        for (let i = 1; i <= 5; i++) {
            state = edit(state.edition, state.history, 'space.01', `N${i}`);
        }
        expect(state.history.past).toHaveLength(3);
        let current = state.edition;
        let history = state.history;
        while (canUndo(history)) {
            const step = undo(history, current);
            current = step.edition;
            history = step.history;
        }
        expect(current.elements['space.01']).toEqual({ name: 'N2' });
    });

    it('undoes a batch in one step', () => {
        const base = setElement(
            setElement(makeEdition(), 'space.01', { name: 'A' }).edition,
            'space.03',
            { name: 'B' },
        ).edition;
        const changes: ElementChange[] = [
            {
                key: 'space.01',
                before: { name: 'A' },
                after: { name: 'C' },
            },
            {
                key: 'space.03',
                before: { name: 'B' },
                after: { name: 'D' },
            },
        ];
        const history = record(createHistory(), changes);
        const step = undo(
            history,
            setElement(
                setElement(base, 'space.01', { name: 'C' }).edition,
                'space.03',
                { name: 'D' },
            ).edition,
        );
        expect(step.edition.elements).toEqual(base.elements);
    });
});
