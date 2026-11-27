import { act, renderHook } from '@testing-library/react';

import type { IngestResult } from '@/features/edition/editor/ingest';
import { PhotoCache } from '@/lib/render/editor-photo-cache';
import { installMemoryServices, sampleEdition } from '@/testing/editions';
import { fakeIngest } from '@/testing/ingest';

import { usePhotoIngest } from './use-photo-ingest';

const record = {
    id: 'photo-1',
    editionId: 'e',
    blob: new Blob(['x']),
    width: 8,
    height: 6,
    createdAt: 1,
};

const file = new File(['x'], 'strand.jpg', { type: 'image/jpeg' });

const mount = () => {
    installMemoryServices();
    const cache = new PhotoCache(() => Promise.resolve(undefined));
    const added = vi.spyOn(cache, 'add');
    const hook = renderHook(() => usePhotoIngest(sampleEdition(), cache));

    return { hook, added };
};

describe('usePhotoIngest', () => {
    beforeEach(() => {
        fakeIngest.ingestPhoto.mockReset();
    });

    it('shows the stage of a file while it is read, and puts the photo in the cache', async () => {
        let finish: (result: IngestResult) => void = () => undefined;
        fakeIngest.ingestPhoto.mockImplementation(
            (_file, _repository, _edition, onStage) =>
                new Promise<IngestResult>((resolve) => {
                    onStage?.('converting');
                    onStage?.('resizing');
                    finish = resolve;
                }),
        );
        const { hook, added } = mount();
        let done: Promise<unknown> = Promise.resolve();

        act(() => {
            done = hook.result.current.ingest(file);
        });

        expect(hook.result.current.uploads).toEqual([
            { kind: 'working', name: 'strand.jpg', stage: 'resizing' },
        ]);

        await act(async () => {
            finish({ ok: true, record });
            await done;
        });

        expect(hook.result.current.uploads).toEqual([]);
        expect(added).toHaveBeenCalledWith(record);
    });

    it('keeps an error or a full storage in the list and gives no photo', async () => {
        const error = {
            code: 'unreadable' as const,
            fileName: 'kapot.jpg',
            rest: { nl: 'is niet te lezen.', en: 'cannot be read.' },
        };
        fakeIngest.ingestPhoto
            .mockResolvedValueOnce({ ok: false, error })
            .mockResolvedValueOnce({
                ok: false,
                storageFull: true,
                fileName: 'groot.jpg',
            });
        const { hook, added } = mount();
        const results: unknown[] = [];

        await act(async () => {
            results.push(await hook.result.current.ingest(file));
            results.push(await hook.result.current.ingest(file));
        });

        expect(results).toEqual([null, null]);
        expect(hook.result.current.uploads).toEqual([
            { kind: 'error', error },
            { kind: 'storage-full', name: 'groot.jpg' },
        ]);
        expect(added).not.toHaveBeenCalled();
    });
});
