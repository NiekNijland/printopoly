import type { AccountEditionStore } from '@/lib/edition/remote/store';
import type { Edition } from '@/lib/edition/types';

/**
 * What Mijn edities does to the account next to the copy in this browser: an edition that lives in the account
 * must be renamed, copied and deleted there too, or the next login brings it back as it was (B81).
 */
export interface AccountActions {
    rename: (id: string, name: string) => Promise<void>;
    /** Puts the copy that was just made in this browser in the account, when the original is there. */
    copy: (sourceId: string, copy: Edition) => Promise<void>;
    remove: (id: string) => Promise<void>;
}

export function createAccountActions(
    store: AccountEditionStore,
): AccountActions {
    return {
        async rename(id, name) {
            const remote = await store.get(id);
            if (remote === undefined) {
                return;
            }
            await store.rename(id, name, remote.revision);
        },

        async copy(sourceId, copy) {
            if ((await store.get(sourceId)) === undefined) {
                return;
            }
            await store.importEditions([copy]);
        },

        async remove(id) {
            // An edition that is not in the account answers 404, which the store takes as done.
            await store.delete(id);
        },
    };
}
