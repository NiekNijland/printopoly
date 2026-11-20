import { diffEditions } from '@/lib/edition/changes';
import type { AccountEditionStore } from '@/lib/edition/remote/store';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition } from '@/lib/edition/types';

export type RemoteSyncEvent =
    /** `pending`: there are changes that are not in the account yet. */
    | { type: 'state'; pending: boolean; syncedAt: number | null }
    /** The account has another version than the one this window started from. */
    | { type: 'conflict'; current: Edition }
    | { type: 'error'; error: unknown };

/**
 * Pushes the changes of an open edition to the account after each local save (B60, B81). Only
 * editions that are in the account are pushed; the others stay in this browser until the person
 * keeps them there. A 409 never overwrites: it comes out as a conflict and the person chooses.
 */
export class RemoteSync {
    private base: Edition | null = null;
    private queue: Promise<void> = Promise.resolve();
    private conflict: Edition | null = null;
    private stop: (() => void) | null = null;

    constructor(
        private readonly remote: AccountEditionStore,
        private readonly session: EditionSession,
        private readonly emit: (event: RemoteSyncEvent) => void,
        private readonly now: () => number = () => Date.now(),
    ) {}

    /** Looks the edition up in the account and starts following the session. */
    start(): Promise<void> {
        this.stop = this.session.subscribe((event) => {
            if (event.type === 'saved') {
                void this.push();
            }
        });

        return this.enqueue(async () => {
            this.base =
                (await this.remote.get(this.session.edition.id)) ?? null;
            await this.pushNow();
        });
    }

    close(): void {
        this.stop?.();
        this.stop = null;
    }

    push(): Promise<void> {
        return this.enqueue(() => this.pushNow());
    }

    private enqueue(task: () => Promise<void>): Promise<void> {
        this.queue = this.queue.then(task).catch((error: unknown) => {
            this.emit({ type: 'error', error });
            this.emit({
                type: 'state',
                pending: true,
                syncedAt: null,
            });
        });

        return this.queue;
    }

    private async pushNow(): Promise<void> {
        if (this.base === null || this.conflict !== null) {
            return;
        }
        const edition = this.session.edition;
        const patch = diffEditions(this.base, edition);
        if (patch === null) {
            this.emit({ type: 'state', pending: false, syncedAt: this.now() });

            return;
        }
        this.emit({ type: 'state', pending: true, syncedAt: null });
        const result = await this.remote.patch(edition.id, patch);
        if (result.ok) {
            this.base = {
                ...edition,
                revision: result.revision,
                updatedAt: result.updatedAt,
            };
            this.emit({ type: 'state', pending: false, syncedAt: this.now() });
        } else if (result.reason === 'conflict') {
            this.conflict = result.current;
            this.emit({ type: 'conflict', current: result.current });
        } else {
            // Deleted in the account: from here on it is a local edition again.
            this.base = null;
            this.emit({ type: 'state', pending: false, syncedAt: null });
        }
    }

    /** "Die van het andere venster" (`theirs`, here the account) or "Deze houden" (`mine`). */
    resolve(choice: 'mine' | 'theirs'): Promise<void> {
        return this.enqueue(async () => {
            const current = this.conflict;
            if (current === null) {
                return;
            }
            if (choice === 'theirs') {
                await this.session.adopt(current);
                this.base = current;
            } else {
                const edition = this.session.edition;
                const result = await this.remote.put(edition, current.revision);
                if (!result.ok) {
                    return;
                }
                this.base = { ...edition, revision: result.revision };
            }
            this.conflict = null;
            this.emit({ type: 'state', pending: false, syncedAt: this.now() });
        });
    }
}
