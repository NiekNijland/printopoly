import { vi } from 'vitest';

type Listener = (payload?: unknown) => void;

const listeners: Record<string, Listener> = {};
const subscription = {
    listen: (event: string, callback: Listener) => {
        listeners[event] = callback;

        return subscription;
    },
};
const client = {
    private: vi.fn(() => subscription),
    channel: vi.fn(() => subscription),
    leave: vi.fn(),
};

export const fakeEcho = {
    listeners,
    client,
    getEcho: vi.fn<() => typeof client | null>(() => null),
};

export const resetFakeEcho = (): void => {
    for (const event of Object.keys(listeners)) {
        Reflect.deleteProperty(listeners, event);
    }
    fakeEcho.getEcho.mockReset();
    client.private.mockClear();
    client.channel.mockClear();
    client.leave.mockClear();
};
