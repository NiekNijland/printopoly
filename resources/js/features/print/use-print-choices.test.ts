import { act, renderHook, waitFor } from '@testing-library/react';

import { jsonOf, requestsOf, stubFetch } from '@/testing/fetch';
import { printJob } from '@/testing/print-job';

import { usePrintChoices } from './use-print-choices';

describe('usePrintChoices', () => {
    it('changes the choice of one set and keeps it on the job, in order (B242)', async () => {
        const status = printJob([]).status;
        const fetchMock = stubFetch(
            () => new Response(JSON.stringify(status), { status: 200 }),
        );
        const setStatus = vi.fn();
        const { result } = renderHook(() =>
            usePrintChoices(printJob([]), setStatus),
        );

        act(() => {
            result.current.choose('printer', { copies: 2 });
        });
        act(() => {
            result.current.choose('printer', { copies: 3 });
        });
        expect(result.current.choices.printer.copies).toBe(3);
        expect(result.current.choices.home.copies).toBe(1);

        await result.current.savingChoices.current;
        await waitFor(() => {
            expect(setStatus).toHaveBeenCalledTimes(2);
        });
        expect(requestsOf(fetchMock).map(({ init }) => jsonOf(init))).toEqual([
            { set: 'printer', copies: 2 },
            { set: 'printer', copies: 3 },
        ]);
    });

    it('keeps a choice only on the page before a job exists', () => {
        const fetchMock = stubFetch();
        const { result } = renderHook(() => usePrintChoices(null, vi.fn()));

        act(() => {
            result.current.choose('home', { invitations: 12 });
        });
        expect(result.current.choices.home.invitations).toBe(12);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
