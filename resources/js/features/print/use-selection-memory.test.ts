import { act, renderHook, waitFor } from '@testing-library/react';

import type { Edition, PrintSelection } from '@/lib/render/edition-types';
import { makeEdition } from '@/testing/edition-test-utils';
import { fakePrintServices, printJob } from '@/testing/print-job';

import { useSelectionMemory } from './use-selection-memory';

describe('useSelectionMemory', () => {
    const next: PrintSelection = { set: 'home', parts: ['board'] };

    it('keeps the choice on the edition and carries the job along (B198)', async () => {
        const edition = { ...makeEdition({ id: 'e1' }), revision: 2 };
        const after = { ...edition, revision: 3 };
        const services = fakePrintServices({
            keepSelection: vi.fn(() => Promise.resolve(after)),
        });
        const saved = vi.fn();
        const { result } = renderHook(() =>
            useSelectionMemory(printJob([]), edition, services, saved),
        );

        act(() => {
            result.current.keep(next);
        });
        expect(result.current.chosen).toBe(next);
        await waitFor(() => {
            expect(services.carryJob).toHaveBeenCalledWith('t', 'e1', 2, 3);
        });
        expect(services.keepSelection).toHaveBeenCalledWith('e1', next);
        expect(saved).toHaveBeenCalledWith(after);
        expect(result.current.rememberFailed).toBe(false);
    });

    it('says so when the choice could not be kept, and keeps nothing without an edition', async () => {
        const services = fakePrintServices({
            keepSelection: vi.fn(() => Promise.reject(new Error('full'))),
        });
        const { result, rerender } = renderHook<
            ReturnType<typeof useSelectionMemory>,
            { edition: Edition | null }
        >(
            ({ edition }) =>
                useSelectionMemory(null, edition, services, vi.fn()),
            { initialProps: { edition: makeEdition({ id: 'e1' }) } },
        );

        act(() => {
            result.current.keep(next);
        });
        await waitFor(() => {
            expect(result.current.rememberFailed).toBe(true);
        });
        expect(services.carryJob).not.toHaveBeenCalled();

        rerender({ edition: null });
        act(() => {
            result.current.keep(next);
        });
        expect(services.keepSelection).toHaveBeenCalledOnce();
    });
});
