import { describe, expect, it } from 'vitest';

import {
    HEX_COLOR,
    MAX_ASPECT,
    MAX_NAME_LENGTH,
    MIN_ASPECT,
    MIN_TITLE_SCALE,
} from './edition-schema-limits';

describe('the limits of the edition schema', () => {
    it('keeps the limits the server checks too', () => {
        expect(MAX_NAME_LENGTH).toBe(120);
        expect(MIN_TITLE_SCALE).toBe(0.5);
        expect([MIN_ASPECT, MAX_ASPECT]).toEqual([0.05, 20]);
    });

    it('takes a colour as six hex digits after a hash', () => {
        expect(HEX_COLOR.test('#A1b2C3')).toBe(true);
        expect(HEX_COLOR.test('#FFF')).toBe(false);
        expect(HEX_COLOR.test('A1B2C3')).toBe(false);
    });
});
