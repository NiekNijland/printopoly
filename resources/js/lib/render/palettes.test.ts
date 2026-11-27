import { describe, expect, it } from 'vitest';

import { PALETTES } from './palettes';

describe('PALETTES', () => {
    it('offers twelve swatches per theme', () => {
        expect(Object.keys(PALETTES).sort()).toEqual([
            'classic',
            'gala',
            'riso',
            'strak',
        ]);
        for (const swatches of Object.values(PALETTES)) {
            expect(swatches).toHaveLength(12);
        }
    });

    it('writes every swatch as #RRGGBB with a Dutch and English name', () => {
        for (const swatches of Object.values(PALETTES)) {
            for (const swatch of swatches) {
                expect(swatch.hex).toMatch(/^#[0-9A-F]{6}$/);
                expect(swatch.name.nl).not.toBe('');
                expect(swatch.name.en).not.toBe('');
            }
        }
    });

    it('has no colour twice within a theme', () => {
        for (const swatches of Object.values(PALETTES)) {
            expect(new Set(swatches.map((swatch) => swatch.hex)).size).toBe(
                swatches.length,
            );
        }
    });
});
