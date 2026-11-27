import { renderHook, waitFor } from '@testing-library/react';

import { makeEdition } from '@/testing/edition-test-utils';
import { stubFetch } from '@/testing/fetch';
import { visit } from '@/testing/inertia';
import { fakePrintServices, printJob } from '@/testing/print-job';

import { useLocalPrintEdition } from './use-local-print-edition';

describe('useLocalPrintEdition', () => {
    it('reads nothing on the page of a job', () => {
        const services = fakePrintServices();
        const { result } = renderHook(() =>
            useLocalPrintEdition(printJob([]), services, 'nl'),
        );

        expect(result.current.reusing).toBe(false);
        expect(services.loadEdition).not.toHaveBeenCalled();
    });

    it('draws the edition of this browser, and makes it again when it printed it before (Niek, 22 nov)', async () => {
        const edition = { ...makeEdition({ id: 'e1' }), revision: 3 };
        const services = fakePrintServices({
            loadEdition: () => Promise.resolve(edition),
        });
        services.jobs.push({
            token: 'old',
            editionId: 'e1',
            revision: 1,
            createdAt: 1,
        });
        const { result } = renderHook(() =>
            useLocalPrintEdition(null, services, 'nl'),
        );

        expect(result.current.reusing).toBe(true);
        await waitFor(() => {
            expect(result.current.reusing).toBe(false);
        });
        expect(result.current.local).toBe(edition);
        expect(result.current.remake).toBe(true);
    });

    it('stops waiting without an edition, and never remakes one printed nowhere', async () => {
        const { result } = renderHook(() =>
            useLocalPrintEdition(null, fakePrintServices(), 'nl'),
        );

        await waitFor(() => {
            expect(result.current.reusing).toBe(false);
        });
        expect(result.current.local).toBeNull();
        expect(result.current.remake).toBe(false);
    });

    it('opens the job it made for this revision already (bug 9 of test round 3)', async () => {
        stubFetch(() => new Response('{}', { status: 200 }));
        const services = fakePrintServices({
            loadEdition: () =>
                Promise.resolve({ ...makeEdition({ id: 'e1' }), revision: 2 }),
        });
        services.jobs.push({
            token: 'a'.repeat(40),
            editionId: 'e1',
            revision: 2,
            createdAt: 1,
        });
        renderHook(() => useLocalPrintEdition(null, services, 'nl'));

        await waitFor(() => {
            expect(visit).toHaveBeenCalledWith(`/nl/print/${'a'.repeat(40)}`, {
                replace: true,
            });
        });
    });
});
