import { describe, expect, it } from 'vitest';

import { mix, readableOn } from './color';

describe('mix', () => {
    it('returns the first colour at 0 and the second at 1', () => {
        expect(mix('#102030', '#FFFFFF', 0)).toBe('#102030');
        expect(mix('#102030', '#FFFFFF', 1)).toBe('#FFFFFF');
    });

    it('blends channel by channel', () => {
        expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    });
});

describe('readableOn', () => {
    it('picks ink on light and white on dark', () => {
        expect(readableOn('#FFFFFF')).toBe('#1B1F24');
        expect(readableOn('#1B1F24')).toBe('#FFFFFF');
    });
});
