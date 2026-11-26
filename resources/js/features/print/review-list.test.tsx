import { describe, expect, it } from 'vitest';

import { reviewQuery } from './review-list';

describe('the way from Nog even nakijken into the editor (B197)', () => {
    it('opens an element at its field', () => {
        expect(
            reviewQuery({ elementKey: 'card.chance.03', field: 'photo' }),
        ).toEqual({ element: 'card.chance.03', field: 'photo' });
    });

    it('opens a key of the edition panel the same way: the editor finds its section', () => {
        expect(
            reviewQuery({ elementKey: 'words.jail', field: 'text' }),
        ).toEqual({ element: 'words.jail', field: 'text' });
    });

    it('opens the list of open messages for a message without an element', () => {
        expect(reviewQuery({ elementKey: 'edition', field: '' })).toEqual({
            check: '1',
        });
    });
});
