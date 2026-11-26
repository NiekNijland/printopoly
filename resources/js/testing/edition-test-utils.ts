import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import {
    EditionBus,
    type ChannelFactory,
    type ChannelLike,
} from '../features/edition/bus';
import type { Scheduler } from '../features/edition/session';
import { createEdition, setElement } from '../lib/render/edition-changes';
import type {
    Edition,
    ElementChange,
    ElementOverride,
    NewEditionInput,
    PhotoPlacement,
} from '../lib/render/edition-types';

/** Test helpers shared by the tests in this folder. */

export const makeEdition = (
    overrides: Partial<NewEditionInput> & { id?: string; now?: number } = {},
): Edition => {
    const { id = 'e1', now = 1_000, ...input } = overrides;

    return createEdition(
        {
            name: 'Zaterdagclub',
            language: 'nl',
            theme: 'classic',
            boardProfile: DEFAULT_BOARD_PROFILE,
            ...input,
        },
        { id, now },
    );
};

export const photo = (photoId = 'p1'): PhotoPlacement => {
    return {
        photoId,
        cx: 0.5,
        cy: 0.5,
        scale: 1,
        rotation: 0,
        grayscale: false,
    };
};

/** Channels with the same name deliver to each other, but not to themselves, like BroadcastChannel. */
export const createFakeNetwork = (): ChannelFactory => {
    const channels = new Set<FakeChannel>();

    class FakeChannel implements ChannelLike {
        onmessage: ((event: { data: unknown }) => void) | null = null;
        postMessage(message: unknown): void {
            for (const other of channels) {
                if (other !== this) {
                    const copy = structuredClone(message);
                    queueMicrotask(() => other.onmessage?.({ data: copy }));
                }
            }
        }
        close(): void {
            channels.delete(this);
        }
    }

    return () => {
        const channel = new FakeChannel();
        channels.add(channel);

        return channel;
    };
};

export const makeBus = (
    factory: ChannelFactory | null,
    windowId: string,
): EditionBus => {
    return new EditionBus(factory, windowId);
};

/** Scheduler that runs callbacks only when the test says so. */
export class ManualScheduler implements Scheduler {
    private next = 1;
    readonly pending = new Map<number, () => void>();

    setTimeout(callback: () => void): unknown {
        const handle = this.next++;
        this.pending.set(handle, callback);

        return handle;
    }

    clearTimeout(handle: unknown): void {
        this.pending.delete(handle as number);
    }

    get size(): number {
        return this.pending.size;
    }

    /** Fires all scheduled callbacks. */
    run(): void {
        const callbacks = [...this.pending.values()];
        this.pending.clear();
        for (const callback of callbacks) {
            callback();
        }
    }
}

/** Waits for queued microtasks and promises. */
export const settle = async (): Promise<void> => {
    for (let i = 0; i < 10; i++) {
        await Promise.resolve();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
};

export const counter = (prefix = 'id'): (() => string) => {
    let n = 0;

    return () => `${prefix}-${++n}`;
};

export const clock = (
    start = 1_000,
): {
    now: () => number;
    set: (value: number) => void;
    tick: (ms?: number) => void;
} => {
    let value = start;

    return {
        now: () => value,
        set: (v) => (value = v),
        tick: (ms = 1) => (value += ms),
    };
};

/** The change that sets `key` to `override` on `edition`; throws when that changes nothing. */
export const changeOf = (
    edition: Edition,
    key: string,
    override: ElementOverride | undefined,
): ElementChange => {
    const { change } = setElement(edition, key, override);
    if (change === null) {
        throw new Error(`No change for ${key}`);
    }

    return change;
};
