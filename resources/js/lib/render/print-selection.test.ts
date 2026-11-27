import { describe, expect, it } from 'vitest';

import { parseEdition } from '@/lib/render/edition-schema';
import { DEFAULT_PARTS, type PrintSelection } from '@/lib/render/edition-types';
import { sampleEdition } from '@/lib/render/sample-edition';

import {
    defaultPrintSelection,
    editionInSet,
    inPrintSelection,
    selectionFromSkipped,
    SET_PARTS,
    skippedOf,
    toggleSelectionPart,
} from './print-selection';

describe('print selection (B198, B199)', () => {
    const base = { ...sampleEdition('nl'), parts: { ...DEFAULT_PARTS } };

    it('starts on the home set with the parts the edition had on, in the names of the edition', () => {
        expect(defaultPrintSelection(base)).toEqual({
            set: 'home',
            parts: ['board', 'deeds', 'cards', 'houseRules'],
        });
        const skipped = skippedOf(
            defaultPrintSelection({
                ...base,
                parts: {
                    ...base.parts,
                    money: true,
                    pawns: true,
                    invitation: true,
                },
            }),
        );

        expect(SET_PARTS.filter((part) => !skipped.includes(part))).toEqual([
            'board',
            'cards',
            'money',
            'tokens',
            'invitation',
        ]);
    });

    it('never takes the board out, and switches every edition part of a row', () => {
        const start = defaultPrintSelection(base);

        expect(toggleSelectionPart(start, 'board')).toBe(start);
        expect(
            toggleSelectionPart(
                toggleSelectionPart(start, 'invitation'),
                'tokens',
            ).parts,
        ).toEqual([
            'board',
            'deeds',
            'cards',
            'houseRules',
            'pawns',
            'invitation',
        ]);
        expect(toggleSelectionPart(start, 'cards').parts).toEqual(['board']);
    });

    it('reads a row as in the set when one of its edition parts is', () => {
        const selection: PrintSelection = {
            set: 'home',
            parts: ['board', 'deeds'],
        };

        expect(inPrintSelection(selection, 'cards')).toBe(true);
        expect(inPrintSelection(selection, 'money')).toBe(false);
    });

    it('tells the server what to skip, and reads it back', () => {
        const selection: PrintSelection = {
            set: 'home',
            parts: ['board', 'money'],
        };

        expect(skippedOf(selection)).toEqual([
            'cards',
            'tokens',
            'box_lid',
            'invitation',
            'rules_booklet',
        ]);
        expect(
            selectionFromSkipped(
                defaultPrintSelection(base),
                ['cards'],
                'printer',
            ),
        ).toEqual({ set: 'printer', parts: ['board'] });
    });

    it('checks only the parts of the set (B197)', () => {
        const parts = editionInSet(base, {
            set: 'home',
            parts: ['board', 'money'],
        }).parts;

        expect(parts.board).toBe(true);
        expect(parts.money).toBe(true);
        expect(parts.cards).toBe(false);
        expect(parts.invitation).toBe(false);
    });

    it('keeps the house rules card with the cards, so the review list says the same as the editor (B210)', () => {
        const parts = editionInSet(base, {
            set: 'home',
            parts: ['board', 'deeds', 'cards', 'houseRules'],
        }).parts;

        expect(parts.houseRules).toBe(true);
    });

    it('reads a stored choice leniently: unknown parts and shapes are dropped', () => {
        const parsePrintSelection = (printSelection: unknown) => {
            const parsed = parseEdition({
                ...sampleEdition('nl'),
                printSelection,
            });

            return parsed.ok ? parsed.value.printSelection : null;
        };

        expect(
            parsePrintSelection({
                set: 'home',
                parts: ['dice', 'money', 'cards', 'box_lid'],
            }),
        ).toEqual({ set: 'home', parts: ['board', 'cards', 'money'] });
        expect(parsePrintSelection({ set: 'shop', parts: [] })).toBeUndefined();
        expect(parsePrintSelection('home')).toBeUndefined();
    });
});
