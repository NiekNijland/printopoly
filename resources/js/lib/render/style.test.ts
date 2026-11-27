import { describe, expect, it } from 'vitest';

import { makeEdition } from '@/testing/edition-test-utils';

import { resolveEdition } from './edition-resolve';
import type { ElementOverride } from './edition-types';
import { buildStyle, partStyleOf } from './style';

const resolvedWith = (elements: Record<string, ElementOverride>) =>
    resolveEdition({ ...makeEdition(), elements });

describe('buildStyle', () => {
    it('changes nothing for an edition that follows its theme', () => {
        expect(buildStyle(resolvedWith({}))).toBeUndefined();
    });

    it('keeps only the group colours someone changed', () => {
        expect(
            buildStyle(resolvedWith({ 'group.brown': { color: '#123456' } })),
        ).toEqual({ groupColors: { brown: '#123456' } });
    });

    it('carries the own style of a part', () => {
        expect(
            buildStyle(resolvedWith({ 'style.board': { style: 'modern' } })),
        ).toEqual({ parts: { board: 'modern' } });
    });
});

describe('partStyleOf', () => {
    it('reads the own style of a part, or undefined', () => {
        const style = { parts: { money: 'playful' as const } };

        expect(partStyleOf(style, 'money')).toBe('playful');
        expect(partStyleOf(style, 'board')).toBeUndefined();
        expect(partStyleOf(undefined, 'board')).toBeUndefined();
        expect(partStyleOf({}, 'deeds')).toBeUndefined();
    });
});
