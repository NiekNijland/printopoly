import { act, renderHook, waitFor } from '@testing-library/react';

import { setServices } from '@/features/edition/editor/testing/services';
import { EditionRepository } from '@/features/edition/repository';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import {
    createFakeNetwork,
    makeBus,
    settle,
} from '@/testing/edition-test-utils';
import { installMemoryServices, sampleEdition } from '@/testing/editions';

import { useEditionList, useServices } from './use-editions';

const servicesOnNetwork = () => {
    const network = createFakeNetwork();
    const storage = new MemoryEditionStorage();
    const bus = makeBus(network, 'this-window');
    const repository = new EditionRepository({
        storage,
        bus,
        now: () => 1_000,
        newId: () => 'new-id',
    });
    setServices({ repository, bus, storage, persistent: false });

    return { storage, other: makeBus(network, 'other-window') };
};

describe('useServices', () => {
    it('gives the services of this window', () => {
        const services = installMemoryServices();

        const { result } = renderHook(() => useServices());

        expect(result.current).toBe(services);
    });
});

describe('useEditionList', () => {
    it('is loading at first and then lists the editions of this browser', async () => {
        const { storage } = installMemoryServices();
        await storage.createEdition(sampleEdition({ id: 'a', name: 'Club' }));

        const { result } = renderHook(() => useEditionList());

        expect(result.current.editions).toBeNull();
        await waitFor(() =>
            expect(result.current.editions?.map((item) => item.name)).toEqual([
                'Club',
            ]),
        );
        expect(result.current.error).toBe(false);
    });

    it('loads again when asked', async () => {
        const { storage } = installMemoryServices();
        const { result } = renderHook(() => useEditionList());
        await waitFor(() => expect(result.current.editions).toEqual([]));

        await storage.createEdition(sampleEdition({ id: 'a' }));
        act(() => result.current.refresh());

        await waitFor(() => expect(result.current.editions).toHaveLength(1));
    });

    it('shows an empty list with an error when the browser cannot read it', async () => {
        const { repository } = installMemoryServices();
        vi.spyOn(repository, 'list').mockRejectedValue(new Error('blocked'));

        const { result } = renderHook(() => useEditionList());

        await waitFor(() => expect(result.current.error).toBe(true));
        expect(result.current.editions).toEqual([]);
    });

    it('loads again when another window changes the list, not when it only saves', async () => {
        const { storage, other } = servicesOnNetwork();
        const { result } = renderHook(() => useEditionList());
        await waitFor(() => expect(result.current.editions).toEqual([]));

        await storage.createEdition(sampleEdition({ id: 'a' }));
        other.post({ kind: 'saved', editionId: 'a', revision: 1 });
        await act(settle);
        expect(result.current.editions).toEqual([]);

        other.post({ kind: 'deleted', editionId: 'b' });

        await waitFor(() => expect(result.current.editions).toHaveLength(1));
    });
});
