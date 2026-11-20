import { useCallback, useEffect, useRef, useState } from 'react';

import {
    BoxApiError,
    closeBox,
    createBox,
    deleteBox,
    fetchBox,
    findAccountBox,
    renewBoxLink,
    resolveContribution,
    updateBox,
} from '@/lib/boxes/api';
import {
    forgetOwnerRecord,
    readOwnerRecord,
    writeOwnerRecord,
} from '@/lib/boxes/local';
import { buildSnapshot } from '@/lib/boxes/snapshot';
import type { OwnerBox } from '@/lib/boxes/types';
import { getEcho } from '@/lib/echo';
import type { Edition } from '@/lib/edition/types';

/** The owner's editor asks for the box this often, next to the live message, in case one is missed. */
const POLL_MS = 15000;

export interface CollectionBox {
    box: OwnerBox | null;
    /** The first look at the server is done (so the page does not flash "start" before the box shows). */
    loaded: boolean;
    busy: boolean;
    error: boolean;
    start: () => Promise<void>;
    refresh: () => Promise<void>;
    close: () => Promise<void>;
    renew: () => Promise<void>;
    remove: () => Promise<void>;
    /** Tells the server the owner decided; the caller applied an accepted one to the edition first. */
    resolve: (
        contributionId: string,
        decision: 'accept' | 'reject',
    ) => Promise<void>;
    /** Gives a photo of a contribution the owner's credentials. */
    secret: string | null;
}

/**
 * The collection box of the open edition ("Samen maken", B128). Without an account the browser holds the owner
 * secret; with one the account owns the box, so a second device finds it too. A box is only looked at when this
 * edition has one. While the editor is open it follows the box live (Reverb) and with a slow poll.
 */
export function useCollectionBox(
    edition: Edition,
    loggedIn: boolean,
): CollectionBox {
    const editionId = edition.id;
    const [box, setBox] = useState<OwnerBox | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);
    const secretRef = useRef<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const boxRef = useRef<OwnerBox | null>(null);

    const apply = useCallback((next: OwnerBox | null) => {
        boxRef.current = next;
        setBox(next);
    }, []);

    const refresh = useCallback(async (): Promise<void> => {
        const current = boxRef.current;
        if (current === null) {
            return;
        }
        try {
            apply(await fetchBox(current.id, secretRef.current));
            setError(false);
        } catch (failure) {
            if (failure instanceof BoxApiError && failure.status === 404) {
                // Deleted or expired: nothing is left to follow.
                forgetOwnerRecord(editionId);
                apply(null);
            } else {
                setError(true);
            }
        }
    }, [apply, editionId]);

    // The first look: a box this browser made, or the one of the account.
    useEffect(() => {
        let cancelled = false;
        const record = readOwnerRecord(editionId);
        secretRef.current = record?.secret ?? null;
        setSecret(secretRef.current);

        async function load(): Promise<void> {
            try {
                if (record !== null) {
                    const found = await fetchBox(record.id, record.secret);
                    if (!cancelled) {
                        apply(found);
                    }
                } else if (loggedIn) {
                    const found = await findAccountBox(editionId);
                    if (!cancelled) {
                        apply(found);
                    }
                }
            } catch (failure) {
                if (failure instanceof BoxApiError && failure.status === 404) {
                    forgetOwnerRecord(editionId);
                    secretRef.current = null;
                    setSecret(null);
                    if (!cancelled && loggedIn) {
                        apply(
                            await findAccountBox(editionId).catch(() => null),
                        );
                    }
                } else if (!cancelled) {
                    setError(true);
                }
            } finally {
                if (!cancelled) {
                    setLoaded(true);
                }
            }
        }

        void load();

        return () => {
            cancelled = true;
        };
    }, [editionId, loggedIn, apply]);

    // Live: Reverb tells that something arrived, and the poll catches what it misses.
    const channel = box?.channel;
    const boxId = box?.id;
    useEffect(() => {
        if (channel === undefined) {
            return;
        }
        const echo = getEcho();
        const subscription = echo?.channel(channel);
        subscription?.listen('.box.activity', () => {
            void refresh();
        });
        const timer = window.setInterval(() => {
            if (document.visibilityState !== 'hidden') {
                void refresh();
            }
        }, POLL_MS);

        return () => {
            window.clearInterval(timer);
            if (echo !== null) {
                echo.leave(channel);
            }
        };
    }, [channel, boxId, refresh]);

    const run = useCallback(
        async (action: () => Promise<void>): Promise<void> => {
            setBusy(true);
            setError(false);
            try {
                await action();
            } catch {
                setError(true);
                throw new Error('box action failed');
            } finally {
                setBusy(false);
            }
        },
        [],
    );

    const start = useCallback(
        () =>
            run(async () => {
                const created = await createBox({
                    editionId,
                    editionName: edition.name,
                    language: edition.language,
                    snapshot: buildSnapshot(edition),
                });
                if (created.ownerSecret !== undefined) {
                    writeOwnerRecord(editionId, {
                        id: created.id,
                        secret: created.ownerSecret,
                    });
                    secretRef.current = created.ownerSecret;
                    setSecret(created.ownerSecret);
                }
                const { ownerSecret, ...owned } = created;
                void ownerSecret;
                apply(owned);
            }),
        [run, edition, editionId, apply],
    );

    // Friends see the current names: bring the snapshot up to date when the editor shows the box.
    const snapshotKey = JSON.stringify([edition.name, buildSnapshot(edition)]);
    const editionRef = useRef(edition);
    useEffect(() => {
        editionRef.current = edition;
    });
    useEffect(() => {
        if (boxId === undefined) {
            return;
        }
        const timer = window.setTimeout(() => {
            updateBox(boxId, secretRef.current, {
                editionName: editionRef.current.name,
                snapshot: buildSnapshot(editionRef.current),
            }).catch(() => undefined);
        }, 2000);

        return () => window.clearTimeout(timer);
    }, [boxId, snapshotKey]);

    return {
        box,
        loaded,
        busy,
        error,
        secret,
        start,
        refresh,
        close: () =>
            run(async () => {
                if (box !== null) {
                    apply(await closeBox(box.id, secretRef.current));
                }
            }),
        renew: () =>
            run(async () => {
                if (box !== null) {
                    apply(await renewBoxLink(box.id, secretRef.current));
                }
            }),
        remove: () =>
            run(async () => {
                if (box !== null) {
                    await deleteBox(box.id, secretRef.current);
                    forgetOwnerRecord(editionId);
                    apply(null);
                }
            }),
        resolve: (contributionId, decision) =>
            run(async () => {
                if (box !== null) {
                    apply(
                        await resolveContribution(
                            box.id,
                            contributionId,
                            secretRef.current,
                            decision,
                        ),
                    );
                }
            }),
    };
}
