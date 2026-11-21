import { describe, expect, it } from 'vitest';

import { listScrollDelta } from './list-scroll';

describe('listScrollDelta', () => {
    const list = { top: 100, bottom: 500 };

    it('leaves a row in sight alone', () => {
        expect(listScrollDelta(list, { top: 200, bottom: 244 }, 56)).toBe(0);
    });

    it('brings back a row that lies under the sticky search field', () => {
        expect(listScrollDelta(list, { top: 120, bottom: 164 }, 56)).toBe(-36);
    });

    it('scrolls down to a row below the list', () => {
        expect(listScrollDelta(list, { top: 480, bottom: 524 }, 56)).toBe(24);
    });
});
