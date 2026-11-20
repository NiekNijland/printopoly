import { usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { createRemoteEditionStore } from '@/lib/edition/remote/store';
import type { EditionConflict, EditionSession } from '@/lib/edition/session';
import { summarizeDifference } from '@/lib/edition/summary';
import { classifySyncError, type SyncProblem } from '@/lib/editor/account';
import { RemoteSync } from '@/lib/editor/remote-sync';
import { uploadAccountPhoto } from '@/lib/print/api';

export interface RemotePush {
    loggedIn: boolean;
    pending: boolean;
    syncedAt: number | null;
    /** The account has another version of this edition: the person chooses (B81). */
    conflict: EditionConflict | null;
    problem: SyncProblem | null;
    resolve: (choice: 'mine' | 'theirs') => void;
}

/** Keeps the account up to date with the open edition, when someone is logged in. */
export function useRemotePush(session: EditionSession): RemotePush {
    const { auth, locale } = usePage().props;
    const loggedIn = auth.user !== null;
    const [state, setState] = useState({
        pending: false,
        syncedAt: null as number | null,
    });
    const [conflict, setConflict] = useState<EditionConflict | null>(null);
    const [problem, setProblem] = useState<SyncProblem | null>(null);
    const store = useMemo(
        () =>
            loggedIn
                ? createRemoteEditionStore({ uploadPhoto: uploadAccountPhoto })
                : null,
        [loggedIn],
    );
    const syncRef = useRef<RemoteSync | null>(null);

    useEffect(() => {
        if (store === null) {
            return;
        }
        const created = new RemoteSync(store, session, (event) => {
            if (event.type === 'state') {
                setState((previous) => ({
                    pending: event.pending,
                    syncedAt: event.syncedAt ?? previous.syncedAt,
                }));
                if (!event.pending) {
                    setProblem(null);
                }
            } else if (event.type === 'conflict') {
                const mine = session.edition;
                setConflict({
                    editionId: mine.id,
                    editionName: mine.name,
                    mine: {
                        at: mine.updatedAt,
                        summary: summarizeDifference(
                            event.current,
                            mine,
                            locale,
                        ),
                    },
                    theirs: {
                        at: event.current.updatedAt,
                        summary: summarizeDifference(
                            mine,
                            event.current,
                            locale,
                        ),
                    },
                    theirsEdition: event.current,
                });
            } else {
                setProblem(classifySyncError(event.error));
            }
        });
        syncRef.current = created;
        void created.start();

        return () => {
            created.close();
            syncRef.current = null;
        };
    }, [store, session, locale]);

    return {
        loggedIn,
        pending: state.pending,
        syncedAt: state.syncedAt,
        conflict,
        problem,
        resolve: (choice) => {
            void syncRef.current?.resolve(choice).then(() => setConflict(null));
        },
    };
}
