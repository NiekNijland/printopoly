import {
    RemoteApiError,
    RemoteAuthError,
    RemoteRateLimitError,
} from '@/features/edition/remote/client';
import type { NewEditionInput } from '@/lib/render/edition-types';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { installMemoryServices } from '@/testing/editions';

import { classifySyncError, wipeLocalCopy } from './account';

describe('wipeLocalCopy', () => {
    it('removes every edition and its photos from this browser', async () => {
        const { repository, storage } = installMemoryServices();
        const input: Omit<NewEditionInput, 'name'> = {
            language: 'nl',
            theme: 'classic',
            boardProfile: DEFAULT_BOARD_PROFILE,
        };
        const first = await repository.create({ ...input, name: 'Een' });
        await repository.create({ ...input, name: 'Twee' });
        const photoId = await repository.addPhoto(first.id, {
            blob: new Blob(['x']),
            width: 4,
            height: 3,
        });

        await wipeLocalCopy(repository);

        expect(await repository.list()).toEqual([]);
        expect(await storage.getPhoto(photoId)).toBeUndefined();
    });

    it('does nothing when the browser holds no edition', async () => {
        const { repository } = installMemoryServices();

        await wipeLocalCopy(repository);

        expect(await repository.list()).toEqual([]);
    });
});

describe('classifySyncError', () => {
    it('asks to log in again after a 401 or 419', () => {
        expect(classifySyncError(new RemoteAuthError(401, null))).toBe('login');
        expect(classifySyncError(new RemoteAuthError(419, null))).toBe('login');
    });

    it('says to wait after too many requests', () => {
        expect(classifySyncError(new RemoteRateLimitError(null, 30))).toBe(
            'rate-limit',
        );
    });

    it('calls anything else a failure', () => {
        expect(classifySyncError(new RemoteApiError(500, null))).toBe('failed');
        expect(classifySyncError(new TypeError('offline'))).toBe('failed');
        expect(classifySyncError('nope')).toBe('failed');
    });
});
