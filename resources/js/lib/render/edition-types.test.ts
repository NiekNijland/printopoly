import { describe, expect, it } from 'vitest';

import {
    DEFAULT_PARTS,
    EXTRA_PART_IDS,
    PART_IDS,
    PRINT_SELECTION_PART_IDS,
    THEME_IDS,
    isThemeId,
} from './edition-types';

describe('isThemeId', () => {
    it('accepts the four themes', () => {
        expect(THEME_IDS.every((id) => isThemeId(id))).toBe(true);
    });

    it('rejects other values', () => {
        expect(isThemeId('neon')).toBe(false);
        expect(isThemeId('')).toBe(false);
        expect(isThemeId(undefined)).toBe(false);
        expect(isThemeId(1)).toBe(false);
    });
});

describe('parts', () => {
    it('turns on only the board, deeds and cards by default', () => {
        expect(PART_IDS.filter((part) => DEFAULT_PARTS[part])).toEqual([
            'board',
            'deeds',
            'cards',
        ]);
    });

    it('lists every part once in the print selection', () => {
        expect([...PRINT_SELECTION_PART_IDS].sort()).toEqual(
            [...PART_IDS].sort(),
        );
    });

    it('keeps the extra parts among the parts and off by default', () => {
        for (const part of EXTRA_PART_IDS) {
            expect(PART_IDS).toContain(part);
            expect(DEFAULT_PARTS[part]).toBe(false);
        }
    });
});
