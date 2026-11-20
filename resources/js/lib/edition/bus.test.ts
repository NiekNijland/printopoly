import { describe, expect, it, vi } from 'vitest';
import {
    CHANNEL_NAME,
    EditionBus,
    browserChannelFactory,
    type ChannelLike,
} from './bus';
import { createFakeNetwork, settle } from './test-utils';

describe('EditionBus', () => {
    it('delivers to other windows and not to itself', async () => {
        const network = createFakeNetwork();
        const a = new EditionBus(network, 'a');
        const b = new EditionBus(network, 'b');
        const heardA = vi.fn();
        const heardB = vi.fn();
        a.subscribe(heardA);
        b.subscribe(heardB);

        a.post({ kind: 'saved', editionId: 'e1', revision: 3 });
        await settle();
        expect(heardA).not.toHaveBeenCalled();
        expect(heardB).toHaveBeenCalledWith({
            kind: 'saved',
            editionId: 'e1',
            revision: 3,
            sender: 'a',
        });
    });

    it('ignores its own echo and garbage', () => {
        let channel: ChannelLike | undefined;
        const bus = new EditionBus((name) => {
            expect(name).toBe(CHANNEL_NAME);
            channel = {
                postMessage: () => undefined,
                close: () => undefined,
                onmessage: null,
            };

            return channel;
        }, 'me');
        const heard = vi.fn();
        bus.subscribe(heard);

        channel?.onmessage?.({ data: { kind: 'list', sender: 'me' } });
        channel?.onmessage?.({ data: 'nonsense' });
        channel?.onmessage?.({ data: null });
        channel?.onmessage?.({ data: { kind: 'unknown', sender: 'x' } });
        channel?.onmessage?.({ data: { kind: 'list', sender: 'other' } });
        expect(heard).toHaveBeenCalledTimes(1);
    });

    it('works without BroadcastChannel', () => {
        const bus = new EditionBus(null, 'a');
        const unsubscribe = bus.subscribe(() => undefined);
        expect(() => bus.post({ kind: 'list' })).not.toThrow();
        unsubscribe();
        bus.close();
    });

    it('stops delivering after unsubscribe and close', async () => {
        const network = createFakeNetwork();
        const a = new EditionBus(network, 'a');
        const b = new EditionBus(network, 'b');
        const heard = vi.fn();
        const unsubscribe = b.subscribe(heard);
        unsubscribe();
        a.post({ kind: 'list' });
        await settle();
        expect(heard).not.toHaveBeenCalled();
        b.close();
        a.post({ kind: 'list' });
        await settle();
        expect(heard).not.toHaveBeenCalled();
    });

    it('wraps the browser BroadcastChannel when there is one', () => {
        const original = globalThis.BroadcastChannel;
        const posted: unknown[] = [];
        class Fake {
            onmessage: ((event: { data: unknown }) => void) | null = null;
            constructor(readonly name: string) {}
            postMessage(message: unknown) {
                posted.push(message);
            }
            close() {}
        }
        // @ts-expect-error replace for the test
        globalThis.BroadcastChannel = Fake;
        try {
            const factory = browserChannelFactory();
            const channel = factory?.(CHANNEL_NAME);
            const heard = vi.fn();
            const bus = new EditionBus(() => channel as ChannelLike, 'w');
            bus.subscribe(heard);
            bus.post({ kind: 'list' });
            expect(posted).toEqual([{ kind: 'list', sender: 'w' }]);
        } finally {
            globalThis.BroadcastChannel = original;
        }
        // @ts-expect-error simulate a browser without it
        delete globalThis.BroadcastChannel;
        try {
            expect(browserChannelFactory()).toBeNull();
        } finally {
            globalThis.BroadcastChannel = original;
        }
    });
});
