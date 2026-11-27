import { renderHook } from '@testing-library/react';

import { makeEdition, settle } from '@/testing/edition-test-utils';
import { jsonOf, requestsOf, stubFetch } from '@/testing/fetch';
import { fakePrintServices, partRow, printJob } from '@/testing/print-job';
import { I18nWrapper } from '@/testing/render';
import type { PrintJobData } from '@/types/generated';

import type { PrintServices } from './print-page-setup';
import { usePrintRequests } from './use-print-requests';
import { useStartsByThemselves } from './use-starts-by-themselves';

const local = makeEdition({ id: 'e1' });

const setup = (
    job: PrintJobData | null,
    services: PrintServices,
    remake: boolean,
) =>
    renderHook(
        () => {
            const requests = usePrintRequests({
                job,
                editionData: null,
                services,
                locale: 'nl',
                status: (job ?? printJob([])).status,
                setStatus: vi.fn(),
                choiceToSend: () => ({ copies: 1 }),
                savingChoices: { current: Promise.resolve() },
            });
            useStartsByThemselves({
                job,
                requests,
                loaded: { local, setLocal: vi.fn(), reusing: false, remake },
                set: 'printer',
                rememberedSet: undefined,
                selected: ['board', 'box_lid'],
            });

            return requests;
        },
        { wrapper: I18nWrapper },
    );

describe('useStartsByThemselves', () => {
    beforeEach(() => {
        window.history.replaceState(null, '', '/nl/print');
    });

    it('puts a part that changed since in line by itself (Niek, 22 nov)', async () => {
        const fetchMock = stubFetch(
            () => new Promise<Response>(() => undefined),
        );
        setup(
            printJob([
                partRow('printer', 'board', 'done'),
                partRow('printer', 'box_lid', 'outdated'),
            ]),
            fakePrintServices(),
            false,
        );

        await vi.waitFor(() => {
            expect(fetchMock).toHaveBeenCalledOnce();
        });
        expect(jsonOf(requestsOf(fetchMock)[0]?.init ?? {})).toMatchObject({
            parts: ['box_lid'],
        });
    });

    it('makes the set of an edition printed before again, once', async () => {
        const services = fakePrintServices();
        setup(null, services, true);

        await vi.waitFor(() => {
            expect(services.loadUpload).toHaveBeenCalledOnce();
        });
    });

    it('starts nothing for an edition printed nowhere before', async () => {
        const services = fakePrintServices();
        setup(null, services, false);

        await settle();
        expect(services.loadUpload).not.toHaveBeenCalled();
    });
});
