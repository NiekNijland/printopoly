import { describe, expect, it } from 'vitest';

import { THEMES } from '@/lib/render/themes';

import { usesCaps } from './caps';

describe('usesCaps', () => {
    it('writes board names in capitals in every theme but Strak', () => {
        expect(usesCaps(THEMES.classic)).toBe(true);
        expect(usesCaps(THEMES.riso)).toBe(true);
        expect(usesCaps(THEMES.gala)).toBe(true);
        expect(usesCaps(THEMES.strak)).toBe(false);
    });
});
