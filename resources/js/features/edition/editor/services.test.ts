import { IDBFactory } from 'fake-indexeddb';

import { IndexedDbEditionStorage } from '@/features/edition/indexeddb-storage';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';

import { getEnvironment, getServices } from './services';
import { setEnvironment, setServices } from './testing/services';

const info = {
    privateWindow: false,
    safariEvictionRisk: false,
    persisted: false,
    storage: null,
};

describe('getServices', () => {
    beforeEach(() => {
        setServices(null);
    });

    it('keeps editions in memory when the browser has no IndexedDB', () => {
        vi.stubGlobal('indexedDB', undefined);

        const services = getServices('nl');

        expect(services.persistent).toBe(false);
        expect(services.storage).toBeInstanceOf(MemoryEditionStorage);
    });

    it('keeps editions in IndexedDB and makes one set per window', async () => {
        vi.stubGlobal('indexedDB', new IDBFactory());

        const services = getServices('en');
        const edition = await services.repository.create({
            name: 'Club',
            language: 'en',
            theme: 'classic',
            boardProfile: DEFAULT_BOARD_PROFILE,
        });

        expect(services.persistent).toBe(true);
        expect(services.storage).toBeInstanceOf(IndexedDbEditionStorage);
        expect(edition.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(getServices('nl')).toBe(services);
        expect((await services.repository.get(edition.id))?.name).toBe('Club');
    });

    it('makes new services after a reset', () => {
        const services = getServices('nl');
        setServices(null);

        expect(getServices('nl')).not.toBe(services);
    });
});

describe('getEnvironment', () => {
    it('gives what a test set, and asks the browser again after a reset', async () => {
        setEnvironment(info);
        expect(await getEnvironment()).toEqual(info);
        expect(getEnvironment()).toBe(getEnvironment());

        vi.stubGlobal('indexedDB', undefined);
        setEnvironment(null);

        expect(await getEnvironment()).toMatchObject({ privateWindow: true });
    });
});
