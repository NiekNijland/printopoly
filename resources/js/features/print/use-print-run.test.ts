import { act, renderHook } from '@testing-library/react';

import { stubFetch } from '@/testing/fetch';
import { fakePrintServices, printJob } from '@/testing/print-job';
import { I18nWrapper } from '@/testing/render';
import type { PrintJobData, PrintPart, PrintSet } from '@/types/generated';

import { usePrintRun } from './use-print-run';

const setup = (job: PrintJobData | null) => {
    const retry = vi.fn<(forSet: PrintSet, chosen: PrintPart[]) => void>();
    const hold = vi.fn<(seconds: number, again: () => void) => void>();
    const setStatus = vi.fn();
    const services = fakePrintServices();
    const view = renderHook(
        () =>
            usePrintRun({
                job,
                editionData: null,
                services,
                locale: 'nl',
                setStatus,
                choiceToSend: () => ({ copies: 1 }),
                savingChoices: { current: Promise.resolve() },
                retryRef: { current: retry },
                hold,
            }),
        { wrapper: I18nWrapper },
    );

    return { ...view, retry, hold, setStatus };
};

const answer = (response: Response | Error) =>
    stubFetch(() =>
        response instanceof Error
            ? Promise.reject(response)
            : Promise.resolve(response),
    );

describe('usePrintRun', () => {
    it('starts a run on the job and takes its status (B95)', async () => {
        const status = printJob([]).status;
        answer(new Response(JSON.stringify(status), { status: 200 }));
        const { result, setStatus } = setup(printJob([]));

        let outcome = '';
        await act(async () => {
            outcome = await result.current.make('printer', ['board']);
        });
        expect(outcome).toBe('started');
        expect(setStatus).toHaveBeenCalledWith(status);
        expect(result.current.working).toBe(false);
        expect(result.current.sending).toBeNull();
    });

    it('keeps the parts in line while the job is busy (409)', async () => {
        answer(new Response('{}', { status: 409 }));
        const { result } = setup(printJob([]));

        let outcome = '';
        await act(async () => {
            outcome = await result.current.make('printer', ['board']);
        });
        expect(outcome).toBe('busy');
        expect(result.current.error).toBeNull();
    });

    it('waits after too many requests and names a refused photo (bug 4, 422)', async () => {
        answer(
            new Response('{}', {
                status: 429,
                headers: { 'Retry-After': '9' },
            }),
        );
        const { result, hold, retry } = setup(printJob([]));

        await act(async () => {
            await result.current.make('home', ['money']);
        });
        expect(hold).toHaveBeenCalledWith(9, expect.any(Function));
        hold.mock.calls[0]?.[1]();
        expect(retry).toHaveBeenCalledWith('home', ['money']);

        answer(new Response('{}', { status: 422 }));
        await act(async () => {
            await result.current.make('home', ['money']);
        });
        expect(result.current.error).toMatch(/foto/i);
    });

    it('keeps a request that lost the connection, to send again once (bug 12)', async () => {
        answer(new TypeError('Failed to fetch'));
        const { result, retry } = setup(printJob([]));

        await act(async () => {
            await result.current.make('printer', ['cards']);
        });
        expect(result.current.lost).not.toBeNull();
        act(() => {
            result.current.lost?.retry();
        });
        expect(retry).toHaveBeenCalledWith('printer', ['cards']);
        expect(result.current.lost).toBeNull();
    });

    it('says there is no edition before a job when this browser has none', async () => {
        const { result } = setup(null);

        let outcome = '';
        await act(async () => {
            outcome = await result.current.make('home', ['board']);
        });
        expect(outcome).toBe('failed');
        expect(result.current.error).toMatch(/geen editie/);
    });
});
