import { renderHook } from '@testing-library/react';

import type { PrintSelection } from '@/lib/render/edition-types';
import { defaultPrintSelection } from '@/lib/render/print-selection';
import { makeEdition } from '@/testing/edition-test-utils';
import { printJob, printPageEdition } from '@/testing/print-job';

import { initialChoices } from './print-page-setup';
import { usePrintCounts } from './use-print-counts';

const NO_CHOICE = initialChoices(null).home;

describe('usePrintCounts', () => {
    const drawn = makeEdition({ id: 'e1' });
    const selection: PrintSelection = {
        ...defaultPrintSelection(drawn),
        set: 'home',
    };

    it('counts the parts in the set, the money and the cards of the edition', () => {
        const { result } = renderHook(() =>
            usePrintCounts({
                job: null,
                edition: printPageEdition,
                drawn,
                checked: null,
                selection,
                set: 'home',
                choice: NO_CHOICE,
            }),
        );

        expect(result.current.selected).toContain('board');
        expect(result.current.moneyAmount).toBe('four');
        expect(result.current.boardForm).toBe('panels');
        expect(result.current.counted.moneyAmount).toBe('four');
        expect(result.current.cardCount).toBeGreaterThan(0);
        expect(result.current.pawnsInSet).toBe(
            result.current.selected.includes('tokens') ? 8 : 0,
        );
    });

    it('takes the cards of the job and the board form of the print shop (B243)', () => {
        const { result } = renderHook(() =>
            usePrintCounts({
                job: printJob([]),
                edition: printPageEdition,
                drawn,
                checked: null,
                selection: { ...selection, set: 'printer' },
                set: 'printer',
                choice: {
                    ...NO_CHOICE,
                    boardForm: 'whole',
                    moneyAmount: 'eight',
                },
            }),
        );

        expect(result.current.cardCount).toBe(60);
        expect(result.current.boardForm).toBe('whole');
        expect(result.current.moneyAmount).toBe('eight');
    });
});
