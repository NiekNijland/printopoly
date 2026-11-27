import { sampleEdition } from '@/testing/editions';
import {
    formOf,
    inOrder,
    jsonOf,
    requestOf,
    requestsOf,
    stubFetch,
} from '@/testing/fetch';

import {
    BoxApiError,
    closeBox,
    createBox,
    deleteBox,
    fetchContributionPhoto,
    fetchOwnReceipts,
    findAccountBox,
    makeShareImage,
    renewBoxLink,
    resolveContribution,
    sendContribution,
    updateBox,
} from './api';
import { buildSnapshot } from './snapshot';

const box = {
    id: 'b1',
    editionId: 'edition-1',
    url: 'https://example.test/box/tok',
    status: 'open',
    expiresAt: 10,
    accepted: 0,
    rejected: 0,
    cardsHidden: false,
    channel: 'box.b1',
    contributions: [],
};

const answer = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), { status });

const headersOf = (init: RequestInit): Headers => new Headers(init.headers);

describe('box api', () => {
    it('creates a box with the CSRF token and keeps the owner secret of the answer', async () => {
        const meta = document.createElement('meta');
        meta.name = 'csrf-token';
        meta.content = 'csrf-value';
        document.head.append(meta);
        const fake = stubFetch(() => answer({ ...box, ownerSecret: 'owner' }));
        const snapshot = buildSnapshot(sampleEdition());

        const created = await createBox({
            editionId: 'edition-1',
            editionName: 'Club',
            language: 'nl',
            snapshot,
        });

        meta.remove();
        expect(created.ownerSecret).toBe('owner');
        const { url, init } = requestOf(fake);
        expect(url).toBe('/api/boxes');
        expect(init.method).toBe('POST');
        expect(init.credentials).toBe('same-origin');
        expect(headersOf(init).get('X-CSRF-TOKEN')).toBe('csrf-value');
        expect(headersOf(init).get('Content-Type')).toBe('application/json');
        expect(headersOf(init).has('X-Box-Owner')).toBe(false);
        expect(jsonOf(init)).toMatchObject({ editionName: 'Club', snapshot });
    });

    it('finds the box of an account edition, or none', async () => {
        const fake = stubFetch(
            inOrder([answer({ box }), answer({ box: null })]),
        );

        expect((await findAccountBox('a b'))?.id).toBe('b1');
        expect(await findAccountBox('x')).toBeNull();
        expect(requestOf(fake).url).toBe('/api/boxes?edition=a%20b');
        expect(requestOf(fake).init.method).toBe('GET');
        expect(headersOf(requestOf(fake).init).get('X-CSRF-TOKEN')).toBe('');
    });

    it('patches, closes and renews a box with the owner secret', async () => {
        const fake = stubFetch(() => answer(box));

        await updateBox('b1', 'secret', { cardsHidden: true });
        await closeBox('b1', 'secret');
        await renewBoxLink('b1', null);

        const [patch, close, renew] = requestsOf(fake);
        expect(patch?.url).toBe('/api/boxes/b1');
        expect(patch?.init.method).toBe('PATCH');
        expect(patch === undefined ? null : jsonOf(patch.init)).toEqual({
            cardsHidden: true,
        });
        expect(close?.url).toBe('/api/boxes/b1/close');
        expect(headersOf(close?.init ?? {}).get('X-Box-Owner')).toBe('secret');
        expect(renew?.url).toBe('/api/boxes/b1/renew');
        expect(headersOf(renew?.init ?? {}).has('X-Box-Owner')).toBe(false);
    });

    it('deletes a box', async () => {
        const fake = stubFetch(() => new Response(null, { status: 204 }));

        await deleteBox('b1', 'secret');

        expect(requestOf(fake)).toMatchObject({
            url: '/api/boxes/b1',
            init: { method: 'DELETE', body: undefined },
        });
    });

    it('resolves a whole contribution or only some parts', async () => {
        const fake = stubFetch(() => answer(box));

        await resolveContribution('b1', 'c1', 's', 'accept');
        await resolveContribution('b1', 'c1', 's', 'reject', ['photo']);

        expect(requestOf(fake).url).toBe(
            '/api/boxes/b1/contributions/c1/resolve',
        );
        expect(jsonOf(requestOf(fake).init)).toEqual({ decision: 'accept' });
        expect(jsonOf(requestOf(fake, 1).init)).toEqual({
            decision: 'reject',
            parts: ['photo'],
        });
    });

    it('fetches the photo of a contribution as a preview or for print', async () => {
        const fake = stubFetch(
            () => new Response(new Blob(['img'], { type: 'image/jpeg' })),
        );

        const blob = await fetchContributionPhoto('/photo/1', 's', 'preview');
        await fetchContributionPhoto('/photo/1', 's');

        expect(await blob.text()).toBe('img');
        expect(requestOf(fake).url).toBe('/photo/1?size=preview');
        expect(requestOf(fake, 1).url).toBe('/photo/1');
    });

    it('sends the amount of a card but not an empty one or a missing photo', async () => {
        const fake = stubFetch(() => answer({ id: 'c', receipt: 'r' }, 201));

        const receipt = await sendContribution('tok', {
            elementKey: 'card.chance.01',
            firstName: 'Sanne',
            value: 'Je wint',
            amount: -20,
            photo: null,
            website: 'bot',
        });
        await sendContribution('tok', {
            elementKey: 'space.01',
            firstName: 'Sanne',
            value: 'Kerkstraat',
            amount: null,
            photo: null,
        });

        expect(receipt).toEqual({ id: 'c', receipt: 'r' });
        const first = formOf(requestOf(fake).init);
        expect(first.get('amount')).toBe('-20');
        expect(first.get('website')).toBe('bot');
        expect(first.has('photo')).toBe(false);
        expect(formOf(requestOf(fake, 1).init).has('amount')).toBe(false);
    });

    it('reads what became of the own contributions and drops unknown states', async () => {
        const fake = stubFetch(() =>
            answer({
                contributions: { r1: 'applied', r2: 'lost', r3: 'waiting' },
            }),
        );

        expect(await fetchOwnReceipts('tok', ['r1', 'r&2'])).toEqual({
            r1: 'applied',
            r3: 'waiting',
        });
        expect(requestOf(fake).url).toBe(
            '/api/box/tok/mine?receipts[]=r1&receipts[]=r%262',
        );
    });

    it('refuses an answer that is no list of states', async () => {
        stubFetch(() => answer({ contributions: null }));

        await expect(fetchOwnReceipts('tok', [])).rejects.toThrow(
            'The server answer is not a list of states.',
        );
    });

    it('keeps the status text when the failure is no JSON', async () => {
        stubFetch(
            () =>
                new Response('<html>', {
                    status: 500,
                    statusText: 'Server Error',
                }),
        );

        const error = await fetchContributionPhoto('/p', null).catch(
            (caught: unknown) => caught,
        );

        expect(error).toBeInstanceOf(BoxApiError);
        expect(error).toMatchObject({ status: 500, message: 'Server Error' });
    });
});

describe('makeShareImage', () => {
    const image = (): Response =>
        new Response(new Blob(['png']), {
            headers: { 'Content-Type': 'image/png' },
        });

    it('asks for the picture until the job has made it', async () => {
        const fake = stubFetch(
            inOrder([
                answer({ id: 'job-1' }, 202),
                answer({ status: 'pending' }),
                image(),
            ]),
        );

        const blob = await makeShareImage({ board: 1 }, { pollMs: 0 });

        expect(await blob.text()).toBe('png');
        expect(requestOf(fake).url).toBe('/api/share-image');
        expect(jsonOf(requestOf(fake).init)).toEqual({ board: 1 });
        expect(requestOf(fake, 2).url).toBe('/api/share-image/job-1');
    });

    it('fails with the message of a job that failed', async () => {
        stubFetch(
            inOrder([
                answer({ id: 'job-1' }),
                answer({ status: 'failed', message: 'Te groot' }),
            ]),
        );

        await expect(makeShareImage({}, { pollMs: 0 })).rejects.toMatchObject({
            status: 500,
            message: 'Te groot',
        });
    });

    it('fails without a message when the job gives none', async () => {
        stubFetch(
            inOrder([answer({ id: 'job-1' }), answer({ status: 'failed' })]),
        );

        await expect(makeShareImage({}, { pollMs: 0 })).rejects.toMatchObject({
            status: 500,
            message: '',
        });
    });

    it('gives up after the waiting time', async () => {
        const fake = stubFetch(inOrder([answer({ id: 'job-1' })]));

        await expect(
            makeShareImage({}, { pollMs: 0, waitMs: 0 }),
        ).rejects.toMatchObject({ status: 504 });
        expect(fake).toHaveBeenCalledTimes(1);
    });

    it('stops when the caller aborts', async () => {
        stubFetch(inOrder([answer({ id: 'job-1' })]));
        const controller = new AbortController();
        controller.abort(new Error('closed'));

        await expect(
            makeShareImage({}, { pollMs: 0, signal: controller.signal }),
        ).rejects.toThrow('closed');
    });
});
