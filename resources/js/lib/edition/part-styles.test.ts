import { describe, expect, it } from 'vitest';

import { resetSection, sectionOfKey } from '@/lib/editor/edition-panel';
import {
    hasOwnStyle,
    panelSections,
    styledPartOfKey,
} from '@/lib/editor/panel-sections';
import { buildStyle, partStyleOf } from '@/lib/render/style';

import { parseKey } from './keys';
import {
    STYLED_PARTS,
    isPartStyle,
    partOfStyleKey,
    partStyleIds,
    partStyleKey,
    partStylesOf,
    partsWithStyles,
    type PartStyleIds,
} from './part-styles';
import json from './part-styles.json';
import { resolveEdition } from './resolve';
import { makeEdition } from './test-utils';
import type { Edition } from './types';

const withElements = (elements: Edition['elements']): Edition => ({
    ...makeEdition(),
    elements,
});

describe('part styles (B268)', () => {
    it('reads the ids of every part from the JSON the server reads too', () => {
        expect(Object.keys(json).sort()).toEqual([...STYLED_PARTS].sort());
        for (const part of STYLED_PARTS) {
            expect(partStyleIds(part)).toEqual(json[part]);
        }
    });

    it('offers the board its styles; the other parts have none yet', () => {
        // Adding a style to a part: add it to part-styles.json and to the union of the part (see part-styles.ts).
        const board: readonly PartStyleIds['board'][] = [
            'vintage',
            'modern',
            'playful',
        ];
        expect(partStyleIds('board')).toEqual(board);
        // The money has the same three (B270).
        expect(partStyleIds('money')).toEqual(board);
        expect(partsWithStyles()).toEqual(
            expect.arrayContaining(['board', 'money']),
        );
    });

    it('offers the pawns and the box lid the same three styles as the board', () => {
        expect(partStyleIds('pawns')).toEqual(partStyleIds('board'));
        expect(partStyleIds('boxLid')).toEqual(partStyleIds('board'));
        expect(partsWithStyles()).toEqual(
            expect.arrayContaining(['pawns', 'boxLid']),
        );
        expect(panelSections('pawn.01')).toContain('style');
        expect(panelSections('box_lid')).toContain('style');
        // A pawn has no free layers: its Stijl section holds the part style only. The lid keeps its own.
        expect(hasOwnStyle('pawn.01')).toBe(false);
        expect(hasOwnStyle('box_lid')).toBe(true);
    });

    it('keeps one element per part, which parses as a style of that part', () => {
        for (const part of STYLED_PARTS) {
            const key = partStyleKey(part);
            expect(partOfStyleKey(key)).toBe(part);
            expect(parseKey(key)).toEqual({ kind: 'partStyle', part });
        }
        expect(partStyleKey('boxLid')).toBe('style.box_lid');
        expect(partOfStyleKey('style.boxLid')).toBeNull();
        expect(partOfStyleKey('style.board.x')).toBeNull();
        expect(parseKey('style.dice')).toBeNull();
    });

    it('reads the styles of an edition, leaving unknown ids out', () => {
        expect(
            partStylesOf({
                'style.board': { style: 'vintage' },
                'style.cards': { style: 'neon' },
            }),
        ).toEqual({ board: 'vintage' });
        expect(isPartStyle('board', 'modern')).toBe(true);
        expect(isPartStyle('board', 'neon')).toBe(false);
    });

    it('passes the style to the renderers, and nothing while every part follows the theme', () => {
        const plain = makeEdition();
        expect(resolveEdition(plain).partStyles).toEqual({});
        expect(buildStyle(resolveEdition(plain))).toBeUndefined();

        const styled = withElements({ 'style.board': { style: 'playful' } });
        const style = buildStyle(resolveEdition(styled));
        expect(style).toEqual({ parts: { board: 'playful' } });
        expect(partStyleOf(style, 'board')).toBe('playful');
        expect(partStyleOf(style, 'cards')).toBeUndefined();
    });

    it('lives in Uiterlijk, where Standaard for the section puts every part back on the theme', () => {
        expect(sectionOfKey('style.board')).toBe('look');
        const edition = withElements({ 'style.board': { style: 'modern' } });
        const reset = resetSection(edition, 'look');
        expect(reset.edition.elements['style.board']).toBeUndefined();
        expect(reset.changes).toHaveLength(1);
    });

    it('shows the board style in the Stijl section of every space, not of the centre', () => {
        expect(styledPartOfKey('space.05')).toBe('board');
        expect(styledPartOfKey('board_center')).toBeNull();
        expect(styledPartOfKey('card_back.deed')).toBe('deeds');
        expect(styledPartOfKey('card_back.chance')).toBe('cards');
        expect(panelSections('space.05')).toContain('style');
        // The cards have no styles yet, so a card keeps its own sections.
        expect(panelSections('card.chance.01')).not.toContain('style');
    });
});
