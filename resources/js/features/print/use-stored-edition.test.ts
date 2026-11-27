import { act, renderHook, waitFor } from '@testing-library/react';

import { makeEdition } from '@/testing/edition-test-utils';
import { fakePrintServices, printJob } from '@/testing/print-job';

import { useStoredEdition } from './use-stored-edition';

describe('useStoredEdition', () => {
    it('reads the edition of this browser on the page of a job (UX 7, B179)', async () => {
        const edition = makeEdition({ id: 'e1' });
        const services = fakePrintServices({
            loadEdition: () => Promise.resolve(edition),
        });
        const { result } = renderHook(() =>
            useStoredEdition(printJob([]), 'e1', services),
        );

        await waitFor(() => {
            expect(result.current[0]).toBe(edition);
        });
        const saved = makeEdition({ id: 'e2' });
        act(() => {
            result.current[1](saved);
        });
        expect(result.current[0]).toBe(saved);
    });

    it('reads nothing before a job or without an edition id', () => {
        const services = fakePrintServices();

        expect(
            renderHook(() => useStoredEdition(null, 'e1', services)).result
                .current[0],
        ).toBeNull();
        renderHook(() => useStoredEdition(printJob([]), null, services));
        expect(services.loadEdition).not.toHaveBeenCalled();
    });
});
