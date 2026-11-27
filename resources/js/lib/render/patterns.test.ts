import { describe, expect, it } from 'vitest';

import { PATTERN_IDS, PATTERN_NAMES, isPatternId } from './patterns';

describe('isPatternId', () => {
    it('accepts every built-in pattern', () => {
        expect(PATTERN_IDS.every((id) => isPatternId(id))).toBe(true);
    });

    it('rejects unknown strings and other values', () => {
        expect(isPatternId('zigzag')).toBe(false);
        expect(isPatternId('')).toBe(false);
        expect(isPatternId(3)).toBe(false);
        expect(isPatternId(null)).toBe(false);
    });
});

describe('PATTERN_NAMES', () => {
    it('names each pattern in Dutch and English', () => {
        expect(Object.keys(PATTERN_NAMES).sort()).toEqual(
            [...PATTERN_IDS].sort(),
        );
        expect(PATTERN_NAMES.checks).toEqual({ nl: 'Ruitjes', en: 'Checks' });
    });
});
