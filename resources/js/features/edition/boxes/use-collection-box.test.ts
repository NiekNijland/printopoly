import { act, renderHook, waitFor } from '@testing-library/react';

import { fakeEcho } from '@/testing/echo';
import { makeEdition } from '@/testing/edition-test-utils';
import { jsonOf, requestsOf, stubFetch } from '@/testing/fetch';

import { readOwnerRecord, writeOwnerRecord } from './local';
import { useCollectionBox } from './use-collection-box';

const box = (overrides: Record<string, unknown> = {}) => ({
    id: 'b1',
    editionId: 'e1',
    url: 'https://example.test/box/tok',
    status: 'open',
    expiresAt: 10,
    accepted: 0,
    rejected: 0,
    cardsHidden: false,
    channel: 'box.b1',
    contributions: [],
    ...overrides,
});

const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), { status });

const mount = (loggedIn = false) =>
    renderHook(() => useCollectionBox(makeEdition({ id: 'e1' }), loggedIn));

const loaded = async (hook: ReturnType<typeof mount>) => {
    await waitFor(() => expect(hook.result.current.loaded).toBe(true));
};

describe('useCollectionBox', () => {
    it('asks nothing for an edition without a box', async () => {
        const fake = stubFetch();
        const hook = mount();

        await loaded(hook);

        expect(hook.result.current.box).toBeNull();
        expect(hook.result.current.secret).toBeNull();
        expect(fake).not.toHaveBeenCalled();
    });

    it('opens the box this browser made, with its secret', async () => {
        writeOwnerRecord('e1', { id: 'b1', secret: 'owner' });
        const fake = stubFetch(() => json(box()));
        const hook = mount();

        await loaded(hook);

        expect(hook.result.current.box?.id).toBe('b1');
        expect(hook.result.current.secret).toBe('owner');
        expect(
            new Headers(requestsOf(fake)[0]?.init.headers).get('X-Box-Owner'),
        ).toBe('owner');
    });

    it('finds the box of the account when the own box is gone', async () => {
        writeOwnerRecord('e1', { id: 'old', secret: 'owner' });
        const fake = stubFetch((url) =>
            url === '/api/boxes/old'
                ? json({}, 404)
                : json({ box: box({ id: 'b2' }) }),
        );
        const hook = mount(true);

        await loaded(hook);

        expect(hook.result.current.box?.id).toBe('b2');
        expect(hook.result.current.secret).toBeNull();
        expect(readOwnerRecord('e1')).toBeNull();
        expect(requestsOf(fake)[1]?.url).toBe('/api/boxes?edition=e1');
    });

    it('forgets a gone box without an account and shows none', async () => {
        writeOwnerRecord('e1', { id: 'old', secret: 'owner' });
        const fake = stubFetch(() => json({}, 404));
        const hook = mount();

        await loaded(hook);

        expect(hook.result.current.box).toBeNull();
        expect(hook.result.current.error).toBe(false);
        expect(fake).toHaveBeenCalledTimes(1);
    });

    it('shows an error when the first look fails', async () => {
        stubFetch(() => json({}, 500));
        const hook = mount(true);

        await loaded(hook);

        expect(hook.result.current.error).toBe(true);
    });

    it('starts a box and keeps its secret in this browser', async () => {
        const fake = stubFetch((url) =>
            url === '/api/boxes'
                ? json({ ...box(), ownerSecret: 'new-owner' }, 201)
                : json({ box: null }),
        );
        const hook = mount(true);
        await loaded(hook);

        await act(() => hook.result.current.start());

        expect(hook.result.current.box).toEqual(box());
        expect(hook.result.current.secret).toBe('new-owner');
        expect(readOwnerRecord('e1')).toEqual({
            id: 'b1',
            secret: 'new-owner',
        });
        expect(jsonOf(requestsOf(fake)[1]?.init ?? {})).toMatchObject({
            editionId: 'e1',
            editionName: 'Zaterdagclub',
            language: 'nl',
        });
    });

    it('starts an account box without a secret', async () => {
        stubFetch((url) =>
            url === '/api/boxes' ? json(box(), 201) : json({ box: null }),
        );
        const hook = mount(true);
        await loaded(hook);

        await act(() => hook.result.current.start());

        expect(hook.result.current.box?.id).toBe('b1');
        expect(readOwnerRecord('e1')).toBeNull();
    });

    it('tells too many clicks apart from too many boxes', async () => {
        let message = 'Too Many Attempts.';
        stubFetch(() => json({ message }, 429));
        const hook = mount();
        await loaded(hook);

        await act(() => hook.result.current.start());
        expect(hook.result.current.box).toBeNull();
        expect(hook.result.current.errorReason).toBe('too_fast');

        message = 'Te veel dozen vandaag.';
        await act(() => hook.result.current.start());

        expect(hook.result.current.error).toBe(true);
        expect(hook.result.current.errorReason).toBe('too_many_boxes');
        expect(hook.result.current.busy).toBe(false);
    });

    it('gives no reason for a failure that is no limit', async () => {
        stubFetch(() => json({}, 500));
        const hook = mount();
        await loaded(hook);

        await act(() => hook.result.current.start());

        expect(hook.result.current.error).toBe(true);
        expect(hook.result.current.errorReason).toBeNull();
    });

    it('closes, renews, hides the cards and resolves with the owner secret', async () => {
        writeOwnerRecord('e1', { id: 'b1', secret: 'owner' });
        const fake = stubFetch((url) =>
            json(box({ status: url.endsWith('/close') ? 'closed' : 'open' })),
        );
        const hook = mount();
        await loaded(hook);

        await act(() => hook.result.current.close());
        expect(hook.result.current.box?.status).toBe('closed');
        await act(() => hook.result.current.renew());
        await act(() => hook.result.current.hideCards(true));
        await act(() => hook.result.current.resolve('c1', 'reject', ['photo']));

        expect(
            requestsOf(fake).map(({ url, init }) => [url, init.method]),
        ).toEqual([
            ['/api/boxes/b1', 'GET'],
            ['/api/boxes/b1/close', 'POST'],
            ['/api/boxes/b1/renew', 'POST'],
            ['/api/boxes/b1', 'PATCH'],
            ['/api/boxes/b1/contributions/c1/resolve', 'POST'],
        ]);
        expect(jsonOf(requestsOf(fake)[3]?.init ?? {})).toEqual({
            cardsHidden: true,
        });
    });

    it('removes the box and forgets it', async () => {
        writeOwnerRecord('e1', { id: 'b1', secret: 'owner' });
        stubFetch((_url, init) =>
            init.method === 'DELETE'
                ? new Response(null, { status: 204 })
                : json(box()),
        );
        const hook = mount();
        await loaded(hook);

        await act(() => hook.result.current.remove());

        expect(hook.result.current.box).toBeNull();
        expect(readOwnerRecord('e1')).toBeNull();
    });

    it('asks nothing for an action without a box', async () => {
        const fake = stubFetch();
        const hook = mount();
        await loaded(hook);

        await act(async () => {
            await hook.result.current.close();
            await hook.result.current.renew();
            await hook.result.current.remove();
            await hook.result.current.hideCards(false);
            await hook.result.current.resolve('c1', 'accept');
            await hook.result.current.refresh();
        });

        expect(fake).not.toHaveBeenCalled();
    });

    it('refreshes the box, shows a failure and drops a box that is gone', async () => {
        writeOwnerRecord('e1', { id: 'b1', secret: 'owner' });
        let status = 200;
        stubFetch(() => json(box({ accepted: status }), status));
        const hook = mount();
        await loaded(hook);

        status = 500;
        await act(() => hook.result.current.refresh());
        expect(hook.result.current.error).toBe(true);

        status = 200;
        await act(() => hook.result.current.refresh());
        expect(hook.result.current.error).toBe(false);

        status = 404;
        await act(() => hook.result.current.refresh());
        expect(hook.result.current.box).toBeNull();
        expect(readOwnerRecord('e1')).toBeNull();
    });

    it('follows the box live and leaves the channel when it closes', async () => {
        fakeEcho.getEcho.mockReturnValue(fakeEcho.client);
        writeOwnerRecord('e1', { id: 'b1', secret: 'owner' });
        let accepted = 0;
        stubFetch(() => json(box({ accepted })));
        const hook = mount();
        await loaded(hook);
        expect(fakeEcho.client.channel).toHaveBeenCalledWith('box.b1');

        accepted = 3;
        act(() => fakeEcho.listeners['.box.activity']?.());

        await waitFor(() => expect(hook.result.current.box?.accepted).toBe(3));
        hook.unmount();
        expect(fakeEcho.client.leave).toHaveBeenCalledWith('box.b1');
    });

    it('asks again every fifteen seconds and sends the current names after a pause', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        writeOwnerRecord('e1', { id: 'b1', secret: 'owner' });
        const fake = stubFetch(() => json(box()));
        const hook = mount();
        await loaded(hook);

        await act(() => vi.advanceTimersByTimeAsync(15_000));

        const calls = requestsOf(fake).map(({ url, init }) => [
            url,
            init.method,
        ]);
        expect(calls).toContainEqual(['/api/boxes/b1', 'PATCH']);
        expect(
            calls.filter(
                ([url, method]) => url === '/api/boxes/b1' && method === 'GET',
            ).length,
        ).toBeGreaterThanOrEqual(2);
        const patch = requestsOf(fake).find(
            ({ init }) => init.method === 'PATCH',
        );
        expect(jsonOf(patch?.init ?? {})).toMatchObject({
            editionName: 'Zaterdagclub',
            snapshot: { theme: 'classic' },
        });
    });
});
