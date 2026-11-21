import { renderHook, waitFor } from '@testing-library/react';

import { fetchBox, findAccountBox } from '@/lib/boxes/api';
import type { OwnerBox } from '@/lib/boxes/types';
import type { EditionSummary } from '@/lib/edition/types';

import { useEditionStatus } from './use-edition-status';

vi.mock('@/lib/boxes/api', () => ({
    fetchBox: vi.fn(),
    findAccountBox: vi.fn(),
}));

function summary(id: string): EditionSummary {
    return {
        id,
        name: id,
        language: 'nl',
        theme: 'classic',
        createdAt: 1,
        updatedAt: 1,
        customizedElements: 0,
    } as EditionSummary;
}

function box(contributions: number): OwnerBox {
    return {
        id: 'box1',
        editionId: 'e',
        url: 'https://example.test/box',
        status: 'open',
        expiresAt: 5000,
        accepted: 0,
        rejected: 0,
        channel: 'box-owner.x',
        contributions: Array.from({ length: contributions }, (_, index) => ({
            id: `c${String(index)}`,
        })),
    } as unknown as OwnerBox;
}

describe('useEditionStatus', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.mocked(fetchBox).mockReset();
        vi.mocked(findAccountBox).mockReset();
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('asks nothing of the server for someone without an account or a box', async () => {
        const { result } = renderHook(() =>
            useEditionStatus([summary('edition-aaaa')], false, null),
        );

        await waitFor(() =>
            expect(result.current['edition-aaaa']).toBeDefined(),
        );
        expect(result.current['edition-aaaa']).toMatchObject({
            contributions: 0,
            boxUntil: null,
        });
        expect(fetch).not.toHaveBeenCalled();
        expect(findAccountBox).not.toHaveBeenCalled();
    });

    it('reads the print state and the box of an edition in the account', async () => {
        vi.mocked(fetch).mockResolvedValue(
            new Response(
                JSON.stringify({
                    editions: [
                        {
                            editionId: 'edition-aaaa',
                            printerReadyUntil: 9000,
                            printerOutdated: false,
                            homeReadyUntil: null,
                            homeOutdated: true,
                        },
                    ],
                }),
            ),
        );
        vi.mocked(findAccountBox).mockResolvedValue(box(3));

        const { result } = renderHook(() =>
            useEditionStatus(
                [summary('edition-aaaa'), summary('edition-bbbb')],
                true,
                new Set(['edition-aaaa']),
            ),
        );

        await waitFor(() =>
            expect(result.current['edition-aaaa']).toBeDefined(),
        );
        expect(result.current['edition-aaaa']).toEqual({
            contributions: 3,
            boxUntil: 5000,
            printer: { readyUntil: 9000, outdated: false },
            home: { readyUntil: null, outdated: true },
        });
        // An edition that is not in the account has no box here and no files.
        expect(result.current['edition-bbbb']).toMatchObject({
            contributions: 0,
            printer: { readyUntil: null },
        });
        expect(findAccountBox).toHaveBeenCalledTimes(1);
    });

    it('uses the owner secret of this browser for a box of an edition without an account', async () => {
        localStorage.setItem(
            'printopoly.boxes.owner',
            JSON.stringify({ 'edition-aaaa': { id: 'box1', secret: 's3' } }),
        );
        vi.mocked(fetchBox).mockResolvedValue(box(2));

        const { result } = renderHook(() =>
            useEditionStatus([summary('edition-aaaa')], false, null),
        );

        await waitFor(() =>
            expect(result.current['edition-aaaa']?.contributions).toBe(2),
        );
        expect(fetchBox).toHaveBeenCalledWith('box1', 's3');
    });

    it('shows no lines when the server does not answer', async () => {
        vi.mocked(fetch).mockRejectedValue(new Error('offline'));
        vi.mocked(findAccountBox).mockRejectedValue(new Error('offline'));

        const { result } = renderHook(() =>
            useEditionStatus(
                [summary('edition-aaaa')],
                true,
                new Set(['edition-aaaa']),
            ),
        );

        await waitFor(() =>
            expect(result.current['edition-aaaa']).toBeDefined(),
        );
        expect(result.current['edition-aaaa']).toMatchObject({
            contributions: 0,
            boxUntil: null,
            printer: { readyUntil: null, outdated: false },
        });
    });
});
