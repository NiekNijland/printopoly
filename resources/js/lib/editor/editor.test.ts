import { describe, expect, it } from 'vitest';

import { runChecks } from '@/lib/checks/checks';
import { createEdition } from '@/lib/edition/changes';
import { DEFAULT_PARTS, type Edition } from '@/lib/edition/types';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';

import {
    BOARD_ORDER,
    boardGroups,
    deedKeyForSpace,
    elementLabel,
    isCustomized,
    stepKey,
    tabCounts,
    tabKeys,
    tabOfKey,
    visibleTabs,
} from './catalogue';
import { buildCheckInput, probeKeys, type Probes } from './checks-input';
import type { PhotoInfos } from './photo-cache';
import { actOnPlacement, newPlacement, placementDpi } from './placements';

function edition(overrides: Partial<Edition> = {}): Edition {
    return {
        ...createEdition(
            {
                name: 'Zaterdagclub',
                language: 'nl',
                theme: 'classic',
                boardProfile: DEFAULT_BOARD_PROFILE,
            },
            { id: 'e1', now: 1 },
        ),
        ...overrides,
    };
}

describe('catalogue', () => {
    it('walks the board in game order and wraps around', () => {
        expect(BOARD_ORDER).toHaveLength(41);
        expect(BOARD_ORDER[0]).toBe('space.00');
        expect(stepKey(BOARD_ORDER, 'space.39', 1)).toBe('board_center');
        expect(stepKey(BOARD_ORDER, 'board_center', 1)).toBe('space.00');
        expect(stepKey(BOARD_ORDER, 'space.00', -1)).toBe('board_center');
    });

    it('lists the board in four stretches of ten', () => {
        const groups = boardGroups();

        expect(groups.map((group) => group.keys.length)).toEqual([
            10, 10, 10, 10,
        ]);
        expect(groups[3]?.to).toBe(0);
    });

    it('shows only the tabs of the chosen parts (B99)', () => {
        expect(visibleTabs({ ...DEFAULT_PARTS })).toEqual(['board', 'cards']);
        expect(
            visibleTabs({
                ...DEFAULT_PARTS,
                money: true,
                pawns: true,
                cards: false,
                deeds: false,
            }),
        ).toEqual(['board', 'money', 'box']);
    });

    it('puts every element key under one tab', () => {
        expect(tabOfKey('space.07')).toBe('board');
        expect(tabOfKey('board_center')).toBe('board');
        expect(tabOfKey('card.chance.03')).toBe('cards');
        expect(tabOfKey('card_back.deed')).toBe('cards');
        expect(tabOfKey('note.100')).toBe('money');
        expect(tabOfKey('pawn.02')).toBe('box');
        expect(tabOfKey('box_lid')).toBe('box');
        expect(tabKeys('cards', DEFAULT_PARTS)).toHaveLength(32 + 3);
    });

    it('counts customised elements and counts a space as changed when its deed is', () => {
        const changed = edition({
            elements: {
                'space.01': { name: 'Jans Bierkelder' },
                'deed.02': { name: 'Het Hok' },
            },
        });

        expect(tabCounts('board', changed)).toEqual({
            customized: 2,
            total: 41,
        });
        expect(isCustomized(changed, 'space.03')).toBe(true);
        expect(isCustomized(changed, 'space.04')).toBe(false);
        expect(deedKeyForSpace(0)).toBeUndefined();
        expect(deedKeyForSpace(1)).toBe('deed.01');
    });

    it('names elements, preferring what the person typed', () => {
        const changed = edition({
            elements: { 'space.01': { name: 'Jans Bierkelder' } },
        });

        expect(elementLabel('space.01', changed, 'nl')).toBe('Jans Bierkelder');
        expect(elementLabel('card.chance.07', changed, 'nl')).toBe('Kans 7');
        expect(elementLabel('card.chance.07', changed, 'en')).toBe('Chance 7');
        expect(elementLabel('note.100', changed, 'nl')).toBe('Biljet van 100');
        expect(elementLabel('pawn.03', changed, 'nl')).toBe('Pion 3');
    });
});

describe('placements', () => {
    const context = {
        source: { w: 4000, h: 3000 },
        frame: { w: 40, h: 30 },
        bleed: 0,
    };

    it('starts centred at 100%', () => {
        expect(newPlacement('p1', context)).toMatchObject({
            cx: 0.5,
            cy: 0.5,
            scale: 1,
            rotation: 0,
        });
    });

    it('zooms within 100 to 300% and pans only inside the photo', () => {
        const start = newPlacement('p1', context);
        const zoomed = actOnPlacement(start, context, {
            type: 'zoom-to',
            scale: 9,
        });
        const panned = actOnPlacement(zoomed, context, {
            type: 'pan',
            dxMm: -1000,
            dyMm: 0,
        });

        expect(zoomed.scale).toBe(3);
        expect(panned.cx).toBeGreaterThan(0.5);
        expect(panned.cx).toBeLessThanOrEqual(1);
    });

    it('moves 0.5 mm per arrow key', () => {
        const zoomed = actOnPlacement(newPlacement('p1', context), context, {
            type: 'zoom-to',
            scale: 2,
        });
        const moved = actOnPlacement(zoomed, context, {
            type: 'nudge',
            direction: 'right',
        });

        // Frame 40 mm, zoom 2: one pixel is 0.02 mm, 4000 px wide, so 0.5 mm is 25 px.
        expect(zoomed.cx - moved.cx).toBeCloseTo(25 / 4000, 6);
    });

    it('turns a quarter and switches black and white', () => {
        const start = newPlacement('p1', context);

        expect(
            actOnPlacement(start, context, { type: 'rotate', turns: 1 })
                .rotation,
        ).toBe(90);
        expect(
            actOnPlacement(start, context, { type: 'grayscale', on: true })
                .grayscale,
        ).toBe(true);
    });

    it('measures the dpi against the frame plus bleed', () => {
        const start = newPlacement('p1', context);

        expect(placementDpi(start, context)).toBeCloseTo(2540, 0);
        expect(placementDpi(start, { ...context, bleed: 3 })).toBeLessThan(
            2540,
        );
    });
});

describe('check input', () => {
    const photos: PhotoInfos = new Map([
        ['p1', { id: 'p1', url: 'blob:x', width: 800, height: 600 }],
    ]);

    it('finds the customised elements the probe has to draw', () => {
        const changed = edition({
            elements: {
                'space.01': { name: 'A' },
                'space.02': { layout: 'full' },
                'card.chance.01': { text: 'x' },
                'note.5': {
                    photo: {
                        photoId: 'p1',
                        cx: 0.5,
                        cy: 0.5,
                        scale: 1,
                        rotation: 0,
                        grayscale: false,
                    },
                },
            },
        });

        // Notes belong to Geld, which is off by default; a layout alone says nothing to check.
        expect(probeKeys(changed).sort()).toEqual([
            'card.chance.01',
            'space.01',
        ]);
    });

    it('turns a small photo in a big frame into a resolution warning, and a long text into a text warning', () => {
        const changed = edition({
            elements: {
                'space.01': {
                    photo: {
                        photoId: 'p1',
                        cx: 0.5,
                        cy: 0.5,
                        scale: 1,
                        rotation: 0,
                        grayscale: false,
                    },
                },
                'card.chance.02': { text: 'te lang' },
            },
        });
        const probes: Probes = new Map([
            ['space.01', { frame: { w: 200, h: 150 }, texts: [] }],
            [
                'card.chance.02',
                {
                    frame: null,
                    texts: [{ fits: false, overflowChars: 20 }],
                },
            ],
        ]);
        const issues = runChecks(buildCheckInput(changed, probes, photos));

        expect(issues.map((issue) => issue.code).sort()).toEqual([
            'photo.low-resolution',
            'text.too-long',
        ]);
        expect(
            issues.find((issue) => issue.code === 'text.too-long')?.field,
        ).toBe('text');
    });
});
