/** What goes over the BroadcastChannel between windows of the same browser. */
export type BusMessage =
    | { kind: 'saved'; editionId: string; revision: number; sender: string }
    | { kind: 'deleted'; editionId: string; sender: string }
    /** Something in the list changed (new, renamed, duplicated): "Mijn edities" should reload. */
    | { kind: 'list'; sender: string };

type WithoutSender<T> = T extends unknown ? Omit<T, 'sender'> : never;

export type BusMessageInput = WithoutSender<BusMessage>;

/** The part of `BroadcastChannel` we use; tests pass an in-memory version. */
export interface ChannelLike {
    postMessage(message: unknown): void;
    close(): void;
    onmessage: ((event: { data: unknown }) => void) | null;
}

export type ChannelFactory = (name: string) => ChannelLike;

export const CHANNEL_NAME = 'printopoly-editions';

function isBusMessage(value: unknown): value is BusMessage {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const { kind, sender } = value as Record<string, unknown>;

    return (
        (kind === 'saved' || kind === 'deleted' || kind === 'list') &&
        typeof sender === 'string'
    );
}

export function browserChannelFactory(): ChannelFactory | null {
    if (typeof BroadcastChannel === 'undefined') {
        return null;
    }

    return (name) => {
        const channel = new BroadcastChannel(name);
        const adapter: ChannelLike = {
            postMessage: (message) => channel.postMessage(message),
            close: () => channel.close(),
            set onmessage(handler: ChannelLike['onmessage']) {
                channel.onmessage =
                    handler === null
                        ? null
                        : (event) => handler({ data: event.data });
            },
            get onmessage() {
                return null;
            },
        };

        return adapter;
    };
}

/** One per window. Without BroadcastChannel it does nothing; the revision check on save still catches conflicts. */
export class EditionBus {
    private readonly channel: ChannelLike | null;
    private readonly listeners = new Set<(message: BusMessage) => void>();

    constructor(
        factory: ChannelFactory | null,
        readonly windowId: string,
    ) {
        this.channel = factory === null ? null : factory(CHANNEL_NAME);
        if (this.channel !== null) {
            this.channel.onmessage = (event) => {
                if (
                    isBusMessage(event.data) &&
                    event.data.sender !== this.windowId
                ) {
                    for (const listener of [...this.listeners]) {
                        listener(event.data);
                    }
                }
            };
        }
    }

    post(message: BusMessageInput): void {
        this.channel?.postMessage({ ...message, sender: this.windowId });
    }

    subscribe(listener: (message: BusMessage) => void): () => void {
        this.listeners.add(listener);

        return () => this.listeners.delete(listener);
    }

    close(): void {
        this.listeners.clear();
        this.channel?.close();
    }
}
