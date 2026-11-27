import { renderHook, waitFor } from '@testing-library/react';

import { stubFetch } from '@/testing/fetch';
import { printJob } from '@/testing/print-job';

import { useBackOnline } from './use-back-online';

describe('useBackOnline', () => {
    it('sends a lost request again once online, and asks where things stand (bug 12)', async () => {
        const status = printJob([]).status;
        const fetchMock = stubFetch(
            () => new Response(JSON.stringify(status), { status: 200 }),
        );
        const retry = vi.fn();
        const setStatus = vi.fn();
        const { rerender } = renderHook(
            ({ online }: { online: boolean }) => {
                useBackOnline(online, { retry }, printJob([]), setStatus);
            },
            { initialProps: { online: false } },
        );

        expect(retry).not.toHaveBeenCalled();
        rerender({ online: true });
        expect(retry).toHaveBeenCalledOnce();
        await waitFor(() => {
            expect(setStatus).toHaveBeenCalledWith(status);
        });
        expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('asks the server nothing when it never went offline, or without a job', () => {
        const fetchMock = stubFetch();

        renderHook(() => {
            useBackOnline(true, null, printJob([]), vi.fn());
        });
        renderHook(() => {
            useBackOnline(true, null, null, vi.fn());
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
