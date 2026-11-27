import { getServices } from '@/features/edition/editor/services';
import { setServices } from '@/features/edition/editor/testing/services';

import { servicesCache } from './services-cache';

describe('servicesCache', () => {
    afterEach(() => {
        setServices(null);
    });

    it('holds the one set of services of the window once they are made', () => {
        setServices(null);
        expect(servicesCache.services).toBeNull();

        const services = getServices('nl');

        expect(servicesCache.services).toBe(services);
        expect(getServices('en')).toBe(services);
    });
});
