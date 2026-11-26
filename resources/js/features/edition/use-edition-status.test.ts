import { renderHook, waitFor } from '@testing-library/react';

import { fetchBox, findAccountBox } from '@/features/edition/boxes/api';
import type { OwnerBox } from '@/features/edition/boxes/types';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import type {
    EditionSummary,
    PrintJobRecord,
} from '@/lib/render/edition-types';
import { jsonOf, requestOf, stubFetch, type FetchFake } from '@/testing/fetch';

import { localSetStatus, useEditionStatus } from './use-edition-status';

vi.mock('@/features/edition/boxes/api', () => ({
    fetchBox: vi.fn(),
    findAccountBox: vi.fn(),
}));

const summary = (id: string): EditionSummary => {
    return {
        id,
        name: id,
        language: 'nl',
        theme: 'classic',
        createdAt: 1,
        updatedAt: 1,
        customizedSpaces: 0,
        customizedElements: 0,
        customizedPercent: 0,
        revision: 4,
    };
};

const box = (contributions: number): OwnerBox => {
    return {
        id: 'box1',
        editionId: 'e',
        url: 'https://example.test/box',
        status: 'open',
        expiresAt: 5000,
        accepted: 0,
        rejected: 0,
        cardsHidden: false,
        channel: 'box-owner.x',
        contributions: Array.from({ length: contributions }, (_, index) => ({
            id: `c${String(index)}`,
            elementKey: 'space.02',
            firstName: 'Sanne',
            field: 'name',
            value: 'Kerkstraat',
            amount: null,
            open: ['name'],
            hasPhoto: false,
            width: null,
            height: null,
            photoUrl: null,
            createdAt: null,
        })),
    };
};

let fetchMock: FetchFake;

describe('useEditionStatus', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.mocked(fetchBox).mockReset();
        vi.mocked(findAccountBox).mockReset();
        fetchMock = stubFetch();
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
        expect(fetchMock).not.toHaveBeenCalled();
        expect(findAccountBox).not.toHaveBeenCalled();
    });

    it('reads the print state and the box of an edition in the account', async () => {
        fetchMock.mockResolvedValue(
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
        fetchMock.mockRejectedValue(new Error('offline'));
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

    it('asks for the jobs this browser kept, by token in the body, without an account', async () => {
        const storage = new MemoryEditionStorage();
        const token = 'a'.repeat(40);
        await storage.addPrintJob({
            token,
            editionId: 'edition-aaaa',
            revision: 4,
            createdAt: 10,
        });
        fetchMock.mockResolvedValue(
            new Response(
                JSON.stringify({
                    jobs: [
                        {
                            token,
                            printerReadyUntil: 7000,
                            printerOutdated: false,
                            homeReadyUntil: null,
                            homeOutdated: false,
                        },
                    ],
                }),
            ),
        );

        const { result } = renderHook(() =>
            useEditionStatus(
                [summary('edition-aaaa'), summary('edition-bbbb')],
                false,
                null,
                storage,
            ),
        );

        await waitFor(() =>
            expect(result.current['edition-aaaa']?.printer.readyUntil).toBe(
                7000,
            ),
        );
        expect(result.current['edition-aaaa']?.home).toEqual({
            readyUntil: null,
            outdated: false,
        });
        expect(result.current['edition-bbbb']?.printer.readyUntil).toBeNull();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const { url, init } = requestOf(fetchMock);
        expect(url).toBe('/api/print-jobs/ready');
        expect(init.method).toBe('POST');
        expect(jsonOf(init)).toEqual({ tokens: [token] });
    });

    it('asks nothing when this browser kept no jobs, and shows no line when the server fails', async () => {
        const storage = new MemoryEditionStorage();
        const { result } = renderHook(() =>
            useEditionStatus([summary('edition-aaaa')], false, null, storage),
        );

        await waitFor(() =>
            expect(result.current['edition-aaaa']).toBeDefined(),
        );
        expect(fetchMock).not.toHaveBeenCalled();

        await storage.addPrintJob({
            token: 'b'.repeat(40),
            editionId: 'edition-aaaa',
            revision: 4,
            createdAt: 1,
        });
        fetchMock.mockResolvedValue(new Response('', { status: 429 }));
        const again = renderHook(() =>
            useEditionStatus([summary('edition-aaaa')], false, null, storage),
        );

        await waitFor(() =>
            expect(again.result.current['edition-aaaa']).toBeDefined(),
        );
        expect(again.result.current['edition-aaaa']?.printer).toEqual({
            readyUntil: null,
            outdated: false,
        });
    });
});

describe('localSetStatus', () => {
    const job = (
        token: string,
        revision: number,
        createdAt: number,
    ): PrintJobRecord => ({ token, editionId: 'e', revision, createdAt });
    const answer = (
        token: string,
        printer: number | null,
        home: number | null,
    ) =>
        [
            token,
            {
                token,
                printerReadyUntil: printer,
                printerOutdated: false,
                homeReadyUntil: home,
                homeOutdated: false,
            },
        ] as const;

    it('takes the newest job that has the set, and calls it outdated after a change', () => {
        const jobs = [job('old', 2, 1), job('new', 3, 2)];
        const ready = new Map([
            answer('old', 100, 300),
            answer('new', 200, null),
        ]);

        expect(localSetStatus('printer', 3, jobs, ready)).toEqual({
            readyUntil: 200,
            outdated: false,
        });
        expect(localSetStatus('home', 3, jobs, ready)).toEqual({
            readyUntil: null,
            outdated: true,
        });
        expect(localSetStatus('home', 2, jobs, ready)).toEqual({
            readyUntil: 300,
            outdated: false,
        });
        expect(localSetStatus('printer', 3, jobs, new Map())).toEqual({
            readyUntil: null,
            outdated: false,
        });
    });
});
