import { renderHook, waitFor } from '@testing-library/react';

import { fetchBox, findAccountBox } from '@/features/edition/boxes/api';
import type { OwnerBox } from '@/features/edition/boxes/types';
import { isJsonObject } from '@/features/edition/remote/client';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import type {
    EditionSummary,
    PrintJobRecord,
} from '@/lib/render/edition-types';
import {
    jsonOf,
    requestOf,
    requestsOf,
    stubFetch,
    type FetchFake,
} from '@/testing/fetch';

import { useEditionStatus } from './use-edition-status';

vi.mock('@/features/edition/boxes/api', () => ({
    fetchBox: vi.fn(),
    findAccountBox: vi.fn(),
}));

const summary = (id: string, revision = 4): EditionSummary => {
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
        revision,
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

describe('useEditionStatus with the jobs of this browser', () => {
    const answer = (
        token: string,
        printer: number | null,
        home: number | null,
    ) => ({
        token,
        printerReadyUntil: printer,
        printerOutdated: false,
        homeReadyUntil: home,
        homeOutdated: false,
    });
    const keep = (storage: MemoryEditionStorage, jobs: PrintJobRecord[]) =>
        Promise.all(jobs.map((job) => storage.addPrintJob(job)));

    beforeEach(() => {
        localStorage.clear();
        vi.mocked(fetchBox).mockReset();
        fetchMock = stubFetch();
    });

    it('takes the newest job that has the set, and calls it outdated after a change', async () => {
        const storage = new MemoryEditionStorage();
        await keep(
            storage,
            ['edition-aaaa', 'edition-bbbb', 'edition-cccc'].flatMap((id) => [
                {
                    token: `${id}-old`,
                    editionId: id,
                    revision: 2,
                    createdAt: 1,
                },
                {
                    token: `${id}-new`,
                    editionId: id,
                    revision: 3,
                    createdAt: 2,
                },
            ]),
        );
        fetchMock.mockResolvedValue(
            new Response(
                JSON.stringify({
                    jobs: ['edition-aaaa', 'edition-bbbb'].flatMap((id) => [
                        answer(`${id}-old`, 100, 300),
                        answer(`${id}-new`, 200, null),
                    ]),
                }),
            ),
        );

        const { result } = renderHook(() =>
            useEditionStatus(
                [
                    summary('edition-aaaa', 3),
                    summary('edition-bbbb', 2),
                    summary('edition-cccc', 3),
                ],
                false,
                null,
                storage,
            ),
        );

        await waitFor(() =>
            expect(result.current['edition-aaaa']?.printer.readyUntil).toBe(
                200,
            ),
        );
        expect(result.current['edition-aaaa']).toMatchObject({
            printer: { readyUntil: 200, outdated: false },
            home: { readyUntil: null, outdated: true },
        });
        expect(result.current['edition-bbbb']?.home).toEqual({
            readyUntil: 300,
            outdated: false,
        });
        expect(result.current['edition-cccc']).toMatchObject({
            printer: { readyUntil: null, outdated: false },
            home: { readyUntil: null, outdated: false },
        });
    });

    it("never sends more tokens in one request than the server's MAX_TOKENS of 50", async () => {
        const storage = new MemoryEditionStorage();
        const tokens = Array.from(
            { length: 101 },
            (_, index) => `token-${String(index).padStart(3, '0')}`,
        );
        await keep(
            storage,
            tokens.map((token, index) => ({
                token,
                editionId: `edition-${token}`,
                revision: 4,
                createdAt: index,
            })),
        );
        const tokensOf = (init: RequestInit): string[] => {
            const body = jsonOf(init);

            return isJsonObject(body) && Array.isArray(body.tokens)
                ? body.tokens.filter((token) => typeof token === 'string')
                : [];
        };
        const fake = stubFetch(
            (_url, init) =>
                new Response(
                    JSON.stringify({
                        jobs: tokensOf(init).map((token) =>
                            answer(token, 7000, null),
                        ),
                    }),
                ),
        );

        const { result } = renderHook(() =>
            useEditionStatus(
                [summary('edition-token-000'), summary('edition-token-100')],
                false,
                null,
                storage,
            ),
        );

        await waitFor(() =>
            expect(
                result.current['edition-token-100']?.printer.readyUntil,
            ).toBe(7000),
        );
        expect(result.current['edition-token-000']?.printer.readyUntil).toBe(
            7000,
        );
        const sent = requestsOf(fake).map(({ init }) => tokensOf(init));
        expect(sent.map((batch) => batch.length)).toEqual([50, 50, 1]);
        expect(sent.flat().toSorted()).toEqual(tokens);
    });
});
