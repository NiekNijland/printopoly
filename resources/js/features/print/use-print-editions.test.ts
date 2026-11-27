import { renderHook, waitFor } from '@testing-library/react';

import { makeEdition } from '@/testing/edition-test-utils';
import {
    fakePrintServices,
    printJob,
    printPageEdition,
} from '@/testing/print-job';

import { usePrintEditions } from './use-print-editions';

describe('usePrintEditions', () => {
    it('draws the edition of this browser before a job, and checks the same one', async () => {
        const local = { ...makeEdition({ id: 'e1' }), name: 'Thuis' };
        const services = fakePrintServices({
            loadEdition: () => Promise.resolve(local),
        });
        const { result } = renderHook(() =>
            usePrintEditions(
                {
                    job: null,
                    editionData: null,
                    localEditionId: 'e1',
                    edition: printPageEdition,
                },
                services,
                'nl',
            ),
        );

        expect(result.current.ready).toBe(false);
        expect(result.current.drawn.name).toBe('');
        await waitFor(() => {
            expect(result.current.ready).toBe(true);
        });
        expect(result.current.drawn).toBe(local);
        expect(result.current.checked).toBe(local);
    });

    it('draws a sample without an edition id, and checks the stored edition on a job page', async () => {
        const stored = makeEdition({ id: 'e2' });
        const services = fakePrintServices({
            loadEdition: () => Promise.resolve(stored),
        });
        const { result } = renderHook(() =>
            usePrintEditions(
                {
                    job: printJob([]),
                    editionData: null,
                    localEditionId: 'e2',
                    edition: printPageEdition,
                },
                services,
                'en',
            ),
        );

        await waitFor(() => {
            expect(result.current.checked).toBe(stored);
        });
        expect(result.current.local).toBeNull();
        expect(result.current.drawn.elements).toEqual({});
    });
});
