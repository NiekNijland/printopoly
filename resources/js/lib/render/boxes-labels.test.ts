import { describe, expect, it } from 'vitest';

import { makeEdition } from '@/testing/edition-test-utils';

import {
    firstStreetKey,
    friendCanAddToSpace,
    groupOf,
    targetLabel,
} from './boxes-labels';

describe('groupOf', () => {
    it('finds the colour group of a group key', () => {
        expect(groupOf('group.lightblue')?.id).toBe('lightblue');
    });

    it('returns undefined for other keys and unknown groups', () => {
        expect(groupOf('space.01')).toBeUndefined();
        expect(groupOf('group.purple')).toBeUndefined();
    });
});

describe('firstStreetKey', () => {
    it('gives the first street of the group', () => {
        expect(firstStreetKey('group.brown')).toBe('space.01');
        expect(firstStreetKey('group.darkblue')).toBe('space.37');
    });

    it('returns undefined for a key that is not a group', () => {
        expect(firstStreetKey('pawn.01')).toBeUndefined();
    });
});

describe('targetLabel', () => {
    const edition = makeEdition();
    const groupWord = (group: string) => `Stad voor ${group}`;

    it('names a group target by its colour', () => {
        expect(targetLabel('group.red', edition, 'nl', groupWord)).toBe(
            'Stad voor rood',
        );
    });

    it('names any other target as the element list does', () => {
        expect(targetLabel('space.01', edition, 'nl', groupWord)).toBe(
            'Molenweg',
        );
        expect(targetLabel('pawn.02', edition, 'nl', groupWord)).toBe('Pion 2');
    });
});

describe('friendCanAddToSpace', () => {
    it('allows streets, stations, utilities and corners', () => {
        expect(friendCanAddToSpace('space.01')).toBe(true);
        expect(friendCanAddToSpace('space.05')).toBe(true);
        expect(friendCanAddToSpace('space.12')).toBe(true);
        expect(friendCanAddToSpace('space.00')).toBe(true);
    });

    it('refuses the deck and tax spaces', () => {
        expect(friendCanAddToSpace('space.02')).toBe(false);
        expect(friendCanAddToSpace('space.07')).toBe(false);
        expect(friendCanAddToSpace('space.04')).toBe(false);
    });

    it('refuses a space number off the board', () => {
        expect(friendCanAddToSpace('space.45')).toBe(false);
    });

    it('allows keys that are not spaces', () => {
        expect(friendCanAddToSpace('pawn.01')).toBe(true);
        expect(friendCanAddToSpace('group.red')).toBe(true);
    });
});
