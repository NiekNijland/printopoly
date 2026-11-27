import { act, renderHook, waitFor } from '@testing-library/react';

import type { PrintPart, PrintSet } from '@/types/generated';

import { usePrintQueue, type StartOutcome } from './use-print-queue';

type Start = (set: PrintSet, parts: PrintPart[]) => Promise<StartOutcome>;

const mount = (start: Start, ready = false) =>
    renderHook(({ on }) => usePrintQueue(on, start), {
        initialProps: { on: ready },
    });

describe('usePrintQueue', () => {
    it('keeps parts in line once, while a run is going', () => {
        const start = vi.fn<Start>(() => Promise.resolve('started'));
        const { result } = mount(start);

        act(() => result.current.enqueue('printer', ['board', 'cards']));
        act(() => result.current.enqueue('printer', ['cards', 'money']));

        expect(result.current.queue).toEqual([
            { set: 'printer', part: 'board' },
            { set: 'printer', part: 'cards' },
            { set: 'printer', part: 'money' },
        ]);
        expect(result.current.isQueued('printer', 'cards')).toBe(true);
        expect(result.current.isQueued('home', 'cards')).toBe(false);
        expect(start).not.toHaveBeenCalled();
    });

    it('has one row for the test sheet of both sets', () => {
        const { result } = mount(vi.fn<Start>());

        act(() => result.current.enqueue('printer', ['calibration']));
        act(() => result.current.enqueue('home', ['calibration']));

        expect(result.current.queue).toHaveLength(1);
        expect(result.current.isQueued('home', 'calibration')).toBe(true);

        act(() => result.current.remove('home', 'calibration'));
        expect(result.current.queue).toEqual([]);
    });

    it('takes a part out of the line', () => {
        const { result } = mount(vi.fn<Start>());
        act(() => result.current.enqueue('home', ['board', 'money']));

        act(() => result.current.remove('home', 'board'));

        expect(result.current.queue).toEqual([{ set: 'home', part: 'money' }]);
    });

    it('starts every waiting part of the first set when the server is free, then the next set', async () => {
        const start = vi.fn<Start>(() => Promise.resolve('started'));
        const { result, rerender } = mount(start);
        act(() => {
            result.current.enqueue('home', ['board']);
            result.current.enqueue('printer', ['money']);
            result.current.enqueue('home', ['cards']);
        });

        rerender({ on: true });

        await waitFor(() => expect(start).toHaveBeenCalledTimes(2));
        expect(start.mock.calls).toEqual([
            ['home', ['board', 'cards']],
            ['printer', ['money']],
        ]);
        expect(result.current.queue).toEqual([]);
    });

    it('drops the parts of a run that failed', async () => {
        const start = vi.fn<Start>(() => Promise.resolve('failed'));
        const { result } = mount(start, true);

        act(() => result.current.enqueue('home', ['board']));

        await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
        expect(result.current.queue).toEqual([]);
    });

    it('puts the parts back and asks again after five seconds when the server is still busy', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const start = vi
            .fn<Start>()
            .mockResolvedValueOnce('busy')
            .mockResolvedValue('started');
        const { result } = mount(start, true);

        act(() => result.current.enqueue('printer', ['board']));
        await waitFor(() =>
            expect(result.current.isQueued('printer', 'board')).toBe(true),
        );
        expect(start).toHaveBeenCalledTimes(1);

        await act(() => vi.advanceTimersByTimeAsync(3_000));
        expect(start).toHaveBeenCalledTimes(1);

        await act(() => vi.advanceTimersByTimeAsync(2_500));
        await waitFor(() => expect(start).toHaveBeenCalledTimes(2));
        expect(start).toHaveBeenLastCalledWith('printer', ['board']);
        expect(result.current.queue).toEqual([]);
    });
});
