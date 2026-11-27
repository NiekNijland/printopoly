import { vi } from 'vitest';

import type * as Ingest from '@/features/edition/editor/ingest';

const real: { ingestPhoto: typeof Ingest.ingestPhoto | null } = {
    ingestPhoto: null,
};

export const fakeIngest = { ingestPhoto: vi.fn<typeof Ingest.ingestPhoto>() };

export const fakeIngestModule = (actual: typeof Ingest): typeof Ingest => {
    real.ingestPhoto = actual.ingestPhoto;
    fakeIngest.ingestPhoto.mockImplementation(actual.ingestPhoto);

    return { ...actual, ingestPhoto: fakeIngest.ingestPhoto };
};

export const resetFakeIngest = (): void => {
    fakeIngest.ingestPhoto.mockReset();
    if (real.ingestPhoto !== null) {
        fakeIngest.ingestPhoto.mockImplementation(real.ingestPhoto);
    }
};
