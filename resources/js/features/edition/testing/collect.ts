import { vi } from 'vitest';

import type { OwnerBox } from '@/features/edition/boxes/types';
import type { CollectionBox } from '@/features/edition/boxes/use-collection-box';

export const fakeCollect = (box: OwnerBox | null = null): CollectionBox => ({
    box,
    loaded: true,
    busy: false,
    error: false,
    errorReason: null,
    start: vi.fn(() => Promise.resolve()),
    refresh: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    renew: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
    resolve: vi.fn(() => Promise.resolve()),
    hideCards: vi.fn(() => Promise.resolve()),
    secret: null,
});

export const openBox = (overrides: Partial<OwnerBox> = {}): OwnerBox => ({
    id: 'b1',
    editionId: 'sample-edition-1',
    url: 'https://printopoly.test/box/abc',
    status: 'open',
    expiresAt: Date.UTC(2026, 11, 21),
    accepted: 0,
    rejected: 0,
    cardsHidden: false,
    channel: 'box.b1',
    contributions: [],
    ...overrides,
});
