import { act, renderHook } from '@testing-library/react';

import { usePrintJob } from '@/features/print/use-print-job';
import { defined } from '@/testing/defined';
import { fakeEcho } from '@/testing/echo';
import { stubFetch } from '@/testing/fetch';
import type { PrintJobData, PrintJobStatusData } from '@/types/generated';

const status = (busy: boolean, done = false): PrintJobStatusData => ({
    busy,
    printerZipUrl: '/zip/printer',
    homeZipUrl: '/zip/home',
    printerZipReady: done,
    homeZipReady: false,
    zipPreparing: false,
    parts: [],
});

const job = (overrides: Partial<PrintJobData> = {}): PrintJobData => ({
    token: 't',
    statusUrl: '/api/print/t/status',
    generateUrl: '/api/print/t/generate',
    channel: { name: 'print-anon.t', private: false },
    status: status(false),
    anonymous: true,
    retentionDays: 7,
    choices: {
        printer: {
            skipped: [],
            moneyAmount: null,
            copies: 1,
            boardForm: 'panels',
            invitations: 4,
        },
        home: {
            skipped: [],
            moneyAmount: null,
            copies: 1,
            boardForm: 'panels',
            invitations: 4,
        },
    },
    ...overrides,
});

describe('usePrintJob', () => {
    beforeEach(() => {
        fakeEcho.getEcho.mockReturnValue(fakeEcho.client);
    });

    it('starts from the status of the page', () => {
        const { result } = renderHook(() =>
            usePrintJob(job({ status: status(true) })),
        );

        expect(result.current.status.busy).toBe(true);
    });

    it('listens on a public channel for a job without an account and on a private one with an account', () => {
        renderHook(() => usePrintJob(job()));
        expect(fakeEcho.client.channel).toHaveBeenCalledWith('print-anon.t');
        expect(fakeEcho.client.private).not.toHaveBeenCalled();

        renderHook(() =>
            usePrintJob(
                job({
                    anonymous: false,
                    channel: { name: 'print-job.t', private: true },
                }),
            ),
        );
        expect(fakeEcho.client.private).toHaveBeenCalledWith('print-job.t');
    });

    it('takes the status from a broadcast and leaves the channel on unmount', () => {
        const { result, unmount } = renderHook(() =>
            usePrintJob(job({ status: status(true) })),
        );

        act(() => {
            defined(fakeEcho.listeners['.print.status'])(status(false, true));
        });
        expect(result.current.status.printerZipReady).toBe(true);

        unmount();
        expect(fakeEcho.client.leave).toHaveBeenCalledWith('print-anon.t');
    });

    it('also polls while the queue makes a missing order sheet, until the ZIP is ready (B235)', async () => {
        vi.useFakeTimers();
        fakeEcho.getEcho.mockReturnValue(null);
        const fetchMock = stubFetch(() =>
            Promise.resolve(
                new Response(JSON.stringify(status(false, true)), {
                    status: 200,
                }),
            ),
        );

        const { result } = renderHook(() =>
            usePrintJob(
                job({ status: { ...status(false), zipPreparing: true } }),
            ),
        );

        await act(async () => {
            await vi.advanceTimersByTimeAsync(4100);
        });

        expect(fetchMock).toHaveBeenCalled();
        expect(result.current.status.printerZipReady).toBe(true);

        vi.useRealTimers();
    });

    it('polls the status endpoint while a run is busy and works without Reverb', async () => {
        vi.useFakeTimers();
        fakeEcho.getEcho.mockReturnValue(null);
        const fetchMock = stubFetch(() =>
            Promise.resolve(
                new Response(JSON.stringify(status(false, true)), {
                    status: 200,
                }),
            ),
        );

        const { result } = renderHook(() =>
            usePrintJob(job({ status: status(true) })),
        );

        await act(async () => {
            await vi.advanceTimersByTimeAsync(4100);
        });

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/print/t/status',
            expect.anything(),
        );
        expect(result.current.status.printerZipReady).toBe(true);

        // Not busy any more: the polling stops.
        fetchMock.mockClear();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(9000);
        });
        expect(fetchMock).not.toHaveBeenCalled();

        vi.useRealTimers();
    });

    it('does not poll an idle job', async () => {
        vi.useFakeTimers();
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        renderHook(() => usePrintJob(job()));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(9000);
        });

        expect(fetchMock).not.toHaveBeenCalled();
        vi.useRealTimers();
    });
});
