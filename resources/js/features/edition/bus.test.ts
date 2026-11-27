import { describe, expect, it, vi } from 'vitest';
import { createFakeNetwork, settle } from '../../testing/edition-test-utils';
import { EditionBus, browserChannelFactory, type ChannelLike } from './bus';

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
            expect(name).toBe('printopoly-editions');
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
        const posted: unknown[] = [];
        class Fake {
            onmessage: ((event: { data: unknown }) => void) | null = null;
            constructor(readonly name: string) {}
            postMessage(message: unknown) {
                posted.push(message);
            }
            close() {}
        }
        vi.stubGlobal('BroadcastChannel', Fake);
        const factory = browserChannelFactory();
        const heard = vi.fn();
        const bus = new EditionBus(factory, 'w');
        bus.subscribe(heard);
        bus.post({ kind: 'list' });
        expect(factory).not.toBeNull();
        expect(posted).toEqual([{ kind: 'list', sender: 'w' }]);
        vi.stubGlobal('BroadcastChannel', undefined);
        expect(browserChannelFactory()).toBeNull();
    });
});
