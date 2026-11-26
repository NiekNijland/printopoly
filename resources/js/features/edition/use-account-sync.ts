import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
    classifySyncError,
    type SyncProblem,
} from '@/features/edition/editor/account';
import { createRemoteEditionStore } from '@/features/edition/remote/store';
import {
    buildSyncQuestion,
    findRemoteOnly,
    type SyncQuestion,
} from '@/features/edition/sync';
import type { Edition } from '@/lib/render/edition-types';
import { uploadAccountPhoto } from '@/lib/render/print-api';

import { useServices } from './use-editions';

type ImportOutcome = {
    imported: number;
    conflicts: number;
    overLimit: number;
};

export type AccountSync = {
    /** The one question after login (B81), or `null` when there is nothing to ask. */
    question: SyncQuestion | null;
    working: boolean;
    outcome: ImportOutcome | null;
    problem: SyncProblem | null;
    /** Ids of the editions the account holds; `null` until the account has answered or when logged out. */
    accountIds: ReadonlySet<string> | null;
    /** Asks the account again which editions it holds, after Mijn edities changed one. */
    refreshAccount: () => void;
    accept: () => void;
    decline: () => void;
};

const declinedKey = (userId: string) => `printopoly.sync-declined.${userId}`;

const wasDeclined = (userId: string): boolean => {
    try {
        return localStorage.getItem(declinedKey(userId)) === '1';
    } catch {
        return false;
    }
};

/**
 * After login (B81): editions in the account that this browser lacks come down as the local
 * cache, and editions that only exist here are offered once with "Bewaren in mijn account".
 * Nothing is overwritten: conflicts and a full account are reported, never resolved silently.
 */
export const useAccountSync = (onChanged: () => void): AccountSync => {
    const { auth, locale } = usePage().props;
    const { repository, storage } = useServices();
    const user = auth.user;
    const store = useMemo(
        () =>
            user === null
                ? null
                : createRemoteEditionStore({ uploadPhoto: uploadAccountPhoto }),
        [user],
    );
    const [question, setQuestion] = useState<SyncQuestion | null>(null);
    const [working, setWorking] = useState(false);
    const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
    const [problem, setProblem] = useState<SyncProblem | null>(null);
    const [accountIds, setAccountIds] = useState<ReadonlySet<string> | null>(
        null,
    );
    const userId = user?.id;
    const userName = user?.name;

    useEffect(() => {
        if (store === null || userId === undefined) {
            return;
        }
        let alive = true;

        void (async () => {
            const remote = await store.listWithLimit();
            if (alive) {
                setAccountIds(new Set(remote.editions.map(({ id }) => id)));
            }
            let local = await repository.list();
            const missing = findRemoteOnly(local, remote.editions);
            for (const summary of missing) {
                const edition = await store.get(summary.id);
                if (edition !== undefined) {
                    await storage.createEdition(edition);
                }
            }
            if (missing.length > 0) {
                local = await repository.list();
                if (alive) {
                    onChanged();
                }
            }
            if (!alive || wasDeclined(userId)) {
                return;
            }
            setQuestion(
                buildSyncQuestion(local, remote.editions, {
                    locale,
                    limit: remote.limit,
                    ...(userName === undefined ? {} : { userName }),
                }),
            );
        })().catch((error: unknown) => {
            if (alive) {
                setProblem(classifySyncError(error));
            }
        });

        return () => {
            alive = false;
        };
    }, [store, userId, userName, repository, storage, locale, onChanged]);

    const accept = useCallback(() => {
        if (store === null || question === null) {
            return;
        }
        const room = question.overLimit?.room ?? question.editions.length;
        const chosen = question.editions.slice(0, room);
        setWorking(true);
        void (async () => {
            const editions: Edition[] = [];
            for (const summary of chosen) {
                const edition = await repository.get(summary.id);
                if (edition !== undefined) {
                    editions.push(edition);
                }
            }
            const report = await store.importEditions(editions);
            setAccountIds(
                (known) => new Set([...(known ?? []), ...report.imported]),
            );
            setOutcome({
                imported: report.imported.length,
                conflicts: report.conflicts.length,
                overLimit:
                    report.overLimit.length +
                    (question.editions.length - chosen.length),
            });
            setQuestion(null);
        })()
            .catch((error: unknown) => setProblem(classifySyncError(error)))
            .finally(() => setWorking(false));
    }, [store, question, repository]);

    const refreshAccount = useCallback(() => {
        if (store === null) {
            return;
        }
        void store
            .listWithLimit()
            .then((remote) =>
                setAccountIds(new Set(remote.editions.map(({ id }) => id))),
            )
            .catch(() => undefined);
    }, [store]);

    const decline = useCallback(() => {
        if (userId !== undefined) {
            try {
                localStorage.setItem(declinedKey(userId), '1');
            } catch {
                // Without storage the question simply comes back next time.
            }
        }
        setQuestion(null);
    }, [userId]);

    return {
        question,
        working,
        outcome,
        problem,
        accountIds: user === null ? null : accountIds,
        refreshAccount,
        accept,
        decline,
    };
};
