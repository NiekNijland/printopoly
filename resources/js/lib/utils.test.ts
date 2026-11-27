import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn', () => {
    it('joins the classes that are on and drops the rest', () => {
        expect(
            cn('a', false, null, undefined, { b: true, c: false }, ['d']),
        ).toBe('a b d');
    });

    it('lets a later utility of the same group win', () => {
        expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    });

    it('keeps a house text size next to a text colour', () => {
        expect(cn('text-hero', 'text-ink')).toBe('text-hero text-ink');
    });

    it('lets one house text size replace another', () => {
        expect(cn('text-sm', 'text-hero')).toBe('text-hero');
    });

    it('answers an empty string without classes', () => {
        expect(cn()).toBe('');
    });
});
