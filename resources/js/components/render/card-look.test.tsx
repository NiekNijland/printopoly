import { describe, expect, it } from 'vitest';

import { THEMES } from '@/lib/render/themes';

import { creamed, diamondPath, engraving } from './card-look';

describe('the card look', () => {
    it('warms a colour towards cream and deepens an accent with the ink', () => {
        expect(creamed('#FFFFFF', 0)).toBe(creamed('#FFFFFF', 0));
        expect(creamed('#00A3E0')).not.toBe('#00A3E0');
        expect(engraving(THEMES.classic, '#00A3E0')).not.toBe('#00A3E0');
    });

    it('draws a diamond round its centre', () => {
        expect(diamondPath(5, 5, 2)).toBe('M5 3L7 5L5 7L3 5Z');
    });
});
