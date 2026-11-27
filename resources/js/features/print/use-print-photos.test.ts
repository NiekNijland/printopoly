import { renderHook, waitFor } from '@testing-library/react';

import { makeEdition } from '@/testing/edition-test-utils';
import { fakePrintServices } from '@/testing/print-job';

import { usePrintPhotos } from './use-print-photos';

describe('usePrintPhotos', () => {
    it('asks this browser for the photos of the drawn and the checked edition', async () => {
        const getPhoto = vi.fn(() => Promise.resolve(undefined));
        const services = fakePrintServices({
            storage: () => ({
                listPrintJobs: () => Promise.resolve([]),
                getPhoto,
            }),
            photoIds: (elements) => Object.keys(elements),
        });
        const drawn = { ...makeEdition({ id: 'a' }), elements: { p1: {} } };
        const checked = {
            ...makeEdition({ id: 'b' }),
            elements: { p1: {}, p2: {} },
        };

        const { result } = renderHook(() =>
            usePrintPhotos(services, drawn, checked),
        );

        await waitFor(() => {
            expect(getPhoto).toHaveBeenCalledTimes(2);
        });
        expect(getPhoto).toHaveBeenCalledWith('p1');
        expect(getPhoto).toHaveBeenCalledWith('p2');
        expect(result.current.size).toBe(0);
    });
});
