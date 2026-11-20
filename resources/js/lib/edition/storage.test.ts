import { describe, expect, it } from 'vitest';
import { MemoryEditionStorage, isQuotaError } from './storage';
import { describeStorageContract } from './storage-contract';
import { makeEdition } from './test-utils';

describeStorageContract('memory', () => new MemoryEditionStorage());

describe('MemoryEditionStorage', () => {
    it('does not share objects with its callers', async () => {
        const storage = new MemoryEditionStorage();
        const edition = makeEdition();
        await storage.createEdition(edition);
        edition.name = 'veranderd';
        const stored = await storage.getEdition(edition.id);
        expect(stored?.name).toBe('Zaterdagclub');
        if (stored !== undefined) stored.name = 'ook veranderd';
        expect((await storage.getEdition(edition.id))?.name).toBe('Zaterdagclub');
    });

    it('fails writes on demand', async () => {
        const storage = new MemoryEditionStorage();
        storage.writeError = new DOMException('full', 'QuotaExceededError');
        await expect(storage.createEdition(makeEdition())).rejects.toThrow('full');
    });
});

describe('isQuotaError', () => {
    it('knows the quota errors of browsers', () => {
        expect(isQuotaError(new DOMException('x', 'QuotaExceededError'))).toBe(true);
        expect(isQuotaError({ name: 'NS_ERROR_DOM_QUOTA_REACHED' })).toBe(true);
        expect(isQuotaError({ code: 22 })).toBe(true);
        expect(isQuotaError(new Error('other'))).toBe(false);
        expect(isQuotaError(null)).toBe(false);
        expect(isQuotaError('QuotaExceededError')).toBe(false);
    });
});
