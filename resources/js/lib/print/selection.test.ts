import { describe, expect, it } from 'vitest';

import { sampleEdition } from '@/data/sample-edition';
import { parsePrintSelection } from '@/lib/edition/schema';
import { DEFAULT_PARTS, type PrintSelection } from '@/lib/edition/types';

import {
    defaultPrintSelection,
    printSelectionOf,
    selectionFromSkipped,
    skippedOf,
    toggleSelectionPart,
} from './selection';

describe('print selection (B198, B199)', () => {
    const base = { ...sampleEdition('nl'), parts: { ...DEFAULT_PARTS } };

    it('starts on the home set with the parts the edition had on', () => {
        expect(defaultPrintSelection(base)).toEqual({
            set: 'home',
            parts: ['board', 'cards'],
        });
        expect(
            defaultPrintSelection({
                ...base,
                parts: {
                    ...base.parts,
                    money: true,
                    pawns: true,
                    invitation: true,
                    // Gone since B200: never in a set.
                    dice: true,
                    foldModels: true,
                },
            }).parts,
        ).toEqual(['board', 'cards', 'money', 'tokens', 'invitation']);
    });

    it('keeps what the print page chose', () => {
        const chosen: PrintSelection = { set: 'printer', parts: ['board'] };

        expect(printSelectionOf({ ...base, printSelection: chosen })).toBe(
            chosen,
        );
    });

    it('never takes the board out, and keeps the order of the page', () => {
        const start = defaultPrintSelection(base);

        expect(toggleSelectionPart(start, 'board')).toBe(start);
        expect(
            toggleSelectionPart(
                toggleSelectionPart(start, 'invitation'),
                'money',
            ).parts,
        ).toEqual(['board', 'cards', 'money', 'invitation']);
        expect(toggleSelectionPart(start, 'cards').parts).toEqual(['board']);
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

    it('reads a stored choice leniently: unknown parts and shapes are dropped', () => {
        expect(
            parsePrintSelection({
                set: 'home',
                parts: ['dice', 'money', 'cards'],
            }),
        ).toEqual({ set: 'home', parts: ['board', 'cards', 'money'] });
        expect(parsePrintSelection({ set: 'shop', parts: [] })).toBeUndefined();
        expect(parsePrintSelection('home')).toBeUndefined();
    });
});
