import {
    RemoteAuthError,
    RemoteRateLimitError,
} from '@/lib/edition/remote/client';
import type { EditionRepository } from '@/lib/edition/repository';

/** Removes every edition and photo from this browser. Used after logging out or deleting the account. */
export async function wipeLocalCopy(
    repository: EditionRepository,
): Promise<void> {
    for (const edition of await repository.list()) {
        await repository.delete(edition.id);
    }
}

export type SyncProblem = 'login' | 'rate-limit' | 'failed';

/** What a failed call to the account means for the person. */
export function classifySyncError(error: unknown): SyncProblem {
    if (error instanceof RemoteAuthError) {
        return 'login';
    }
    if (error instanceof RemoteRateLimitError) {
        return 'rate-limit';
    }

    return 'failed';
}
