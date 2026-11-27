import { describe, expect, it } from 'vitest';

import { colorName } from './color-names';

describe('colorName', () => {
    it('keeps the standard name of a standard group colour', () => {
        expect(colorName('#955436', 'nl')).toEqual({
            name: 'bruin',
            before: 'bruine',
        });
        expect(colorName('#0072BB', 'en')).toEqual({
            name: 'dark blue',
            before: 'dark blue',
        });
    });

    it('names the nearest colour as the eye sees it', () => {
        expect(colorName('#9A4E8E', 'nl')).toEqual({
            name: 'paars',
            before: 'paarse',
        });
        expect(colorName('#000000', 'en').name).toBe('black');
        expect(colorName('#ffffff', 'nl').name).toBe('wit');
    });

    it('reads lowercase hex', () => {
        expect(colorName('#ed1b24', 'nl').before).toBe('rode');
    });

    it('falls back to the first colour for a value that is not #RRGGBB', () => {
        expect(colorName('red', 'nl')).toEqual({
            name: 'bruin',
            before: 'bruine',
        });
        expect(colorName('#fff', 'en').name).toBe('brown');
    });
});
