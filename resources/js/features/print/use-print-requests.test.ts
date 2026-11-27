import { act, renderHook } from '@testing-library/react';

import { jsonOf, requestsOf, stubFetch } from '@/testing/fetch';
import { fakePrintServices, partRow, printJob } from '@/testing/print-job';
import { I18nWrapper } from '@/testing/render';
import type { PrintJobData } from '@/types/generated';

import { NO_CHOICE } from './print-page-setup';
import { choiceToSendOf, usePrintRequests } from './use-print-requests';

const setup = (job: PrintJobData) =>
    renderHook(
        () =>
            usePrintRequests({
                job,
                editionData: null,
                services: fakePrintServices(),
                locale: 'nl',
                status: job.status,
                setStatus: vi.fn(),
                choiceToSend: () => ({ copies: 1 }),
                savingChoices: { current: Promise.resolve() },
            }),
        { wrapper: I18nWrapper },
    );

describe('usePrintRequests', () => {
    it('puts a part in line while a run is busy, never twice, and takes it out again', () => {
        const fetchMock = stubFetch();
        const { result } = setup(
            printJob([partRow('printer', 'cards', 'running')], { busy: true }),
        );

        expect(result.current.isActive('cards', 'printer')).toBe(true);
        act(() => {
            result.current.request('printer', ['cards', 'money']);
        });
        expect(result.current.isQueued('printer', 'money')).toBe(true);
        expect(result.current.isQueued('printer', 'cards')).toBe(false);
        expect(result.current.wantedOf('printer', ['money', 'tokens'])).toEqual(
            ['tokens'],
        );
        act(() => {
            result.current.remove('printer', 'money');
        });
        expect(result.current.queue).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('starts the parts in line once the job is free (B70)', async () => {
        const fetchMock = stubFetch(
            () => new Promise<Response>(() => undefined),
        );
        const { result } = setup(printJob([]));

        act(() => {
            result.current.request('home', ['board']);
        });
        await vi.waitFor(() => {
            expect(fetchMock).toHaveBeenCalledOnce();
        });
        expect(jsonOf(requestsOf(fetchMock)[0]?.init ?? {})).toMatchObject({
            set: 'home',
            parts: ['board'],
        });
        expect(result.current.rowFor('board', 'home')?.status).toBe('waiting');
    });
});

describe('choiceToSendOf', () => {
    it('sends the parts skipped in the set with the choices of one set (B198)', () => {
        expect(
            choiceToSendOf(
                { set: 'home', parts: ['board'] },
                { ...NO_CHOICE, copies: 2 },
            ),
        ).toMatchObject({ copies: 2, moneyAmount: null, invitations: 4 });
        expect(
            choiceToSendOf({ set: 'home', parts: ['board'] }, NO_CHOICE)
                .skipped,
        ).toContain('money');
    });
});
