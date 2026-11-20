import { act, renderHook } from '@testing-library/react';

import { usePrintJob } from '@/hooks/use-print-job';
import type { PrintJobData, PrintJobStatusData } from '@/types/generated';

type Listener = (payload: PrintJobStatusData) => void;

const echo = vi.hoisted(() => {
    const listeners: Record<string, (payload: unknown) => void> = {};
    const subscription = {
        listen: (event: string, callback: (payload: unknown) => void) => {
            listeners[event] = callback;

            return subscription;
        },
    };

    return {
        listeners,
        subscription,
        client: {
            private: vi.fn(() => subscription),
            channel: vi.fn(() => subscription),
            leave: vi.fn(),
        },
    };
});

const getEcho = vi.hoisted(() => vi.fn());

vi.mock('@/lib/echo', () => ({ getEcho }));

const status = (busy: boolean, done = false): PrintJobStatusData => ({
    busy,
    printerZipUrl: '/zip/printer',
    homeZipUrl: '/zip/home',
    printerZipReady: done,
    homeZipReady: false,
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
    ...overrides,
});

describe('usePrintJob', () => {
    beforeEach(() => {
        getEcho.mockReturnValue(echo.client);
        echo.client.private.mockClear();
        echo.client.channel.mockClear();
        echo.client.leave.mockClear();
    });

    it('starts from the status of the page', () => {
        const { result } = renderHook(() =>
            usePrintJob(job({ status: status(true) })),
        );

        expect(result.current.status.busy).toBe(true);
    });

    it('listens on a public channel for a job without an account and on a private one with an account', () => {
        renderHook(() => usePrintJob(job()));
        expect(echo.client.channel).toHaveBeenCalledWith('print-anon.t');
        expect(echo.client.private).not.toHaveBeenCalled();

        renderHook(() =>
            usePrintJob(
                job({
                    anonymous: false,
                    channel: { name: 'print-job.t', private: true },
                }),
            ),
        );
        expect(echo.client.private).toHaveBeenCalledWith('print-job.t');
    });

    it('takes the status from a broadcast and leaves the channel on unmount', () => {
        const { result, unmount } = renderHook(() =>
            usePrintJob(job({ status: status(true) })),
        );

        act(() => {
            (echo.listeners['.print.status'] as Listener)(status(false, true));
        });
        expect(result.current.status.printerZipReady).toBe(true);

        unmount();
        expect(echo.client.leave).toHaveBeenCalledWith('print-anon.t');
    });

    it('polls the status endpoint while a run is busy and works without Reverb', async () => {
        vi.useFakeTimers();
        getEcho.mockReturnValue(null);
        const fetchMock = vi.fn(() =>
            Promise.resolve(
                new Response(JSON.stringify(status(false, true)), {
                    status: 200,
                }),
            ),
        );
        vi.stubGlobal('fetch', fetchMock);

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

        vi.unstubAllGlobals();
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
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });
});
