import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type RefObject,
} from 'react';

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
} from '@/features/edition/boxes/api';
import {
    forgetOwnerRecord,
    readOwnerRecord,
    writeOwnerRecord,
} from '@/features/edition/boxes/local';
import { buildSnapshot } from '@/features/edition/boxes/snapshot';
import type {
    ContributionPart,
    OwnerBox,
} from '@/features/edition/boxes/types';
import { reportAndReturn, reportUnlessOffline } from '@/lib/bugsnag';
import { getEcho } from '@/lib/echo';
import type { Edition } from '@/lib/render/edition-types';

/** The owner's editor asks for the box this often, next to the live message, in case one is missed. */
const POLL_MS = 15000;

export type CollectionBox = {
    box: OwnerBox | null;
    /** The first look at the server is done (so the page does not flash "start" before the box shows). */
    loaded: boolean;
    busy: boolean;
    error: boolean;
    /**
     * Why the last action failed, when the server said so: too many links from this network today, or too many
     * clicks in a minute (bug 6 of test round 4). Null for any other failure.
     */
    errorReason: 'too_many_boxes' | 'too_fast' | null;
    start: () => Promise<void>;
    refresh: () => Promise<void>;
    close: () => Promise<void>;
    renew: () => Promise<void>;
    remove: () => Promise<void>;
    /** Tells the server the owner decided; the caller applied an accepted one to the edition first. */
    resolve: (
        contributionId: string,
        decision: 'accept' | 'reject',
        parts?: readonly ContributionPart[],
    ) => Promise<void>;
    /** Gives a photo of a contribution the owner's credentials. */
    secret: string | null;
    /** Friends see the card texts or not (B176). */
    hideCards: (hidden: boolean) => Promise<void>;
};

const useOwnerSecret = () => {
    const secretRef = useRef<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const remember = useCallback((next: string | null) => {
        secretRef.current = next;
        setSecret(next);
    }, []);

    return { secretRef, secret, remember };
};

const useBoxAction = () => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);
    const [errorReason, setErrorReason] =
        useState<CollectionBox['errorReason']>(null);

    const run = useCallback(
        async (action: () => Promise<void>): Promise<boolean> => {
            setBusy(true);
            setError(false);
            setErrorReason(null);
            try {
                await action();

                return true;
            } catch (failure) {
                setError(true);
                if (!(failure instanceof BoxApiError)) {
                    reportUnlessOffline(failure);
                }
                // Laravel's own limit per minute says "Too Many Attempts."; the limit per day has our message.
                if (failure instanceof BoxApiError && failure.status === 429) {
                    setErrorReason(
                        failure.message === 'Too Many Attempts.'
                            ? 'too_fast'
                            : 'too_many_boxes',
                    );
                }

                return false;
            } finally {
                setBusy(false);
            }
        },
        [],
    );

    return { busy, error, setError, errorReason, run };
};

// The first look: a box this browser made, or the one of the account.
const useFirstLook = (
    editionId: string,
    loggedIn: boolean,
    apply: (next: OwnerBox | null) => void,
    remember: (secret: string | null) => void,
    setError: (error: boolean) => void,
): boolean => {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const record = readOwnerRecord(editionId);
        remember(record?.secret ?? null);

        const load = async (): Promise<void> => {
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
                    remember(null);
                    if (!cancelled && loggedIn) {
                        apply(
                            await findAccountBox(editionId).catch(
                                reportAndReturn(null),
                            ),
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
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, [editionId, loggedIn, apply, remember, setError]);

    return loaded;
};

// Live: Reverb tells that something arrived, and the poll catches what it misses.
const useFollowBox = (
    channel: string | undefined,
    boxId: string | undefined,
    refresh: () => Promise<void>,
): void => {
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
};

// Friends see the current names: bring the snapshot up to date when the editor shows the box.
const useSnapshotUpdate = (
    edition: Edition,
    boxId: string | undefined,
    secretRef: RefObject<string | null>,
): void => {
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
            }).catch(reportUnlessOffline);
        }, 2000);

        return () => window.clearTimeout(timer);
    }, [boxId, snapshotKey, secretRef]);
};

type BoxActions = Pick<
    CollectionBox,
    'close' | 'renew' | 'remove' | 'hideCards' | 'resolve'
>;

const useBoxActions = (
    box: OwnerBox | null,
    secretRef: RefObject<string | null>,
    forget: () => void,
    apply: (next: OwnerBox | null) => void,
    run: (action: () => Promise<void>) => Promise<boolean>,
): BoxActions => ({
    close: async () => {
        await run(async () => {
            if (box !== null) {
                apply(await closeBox(box.id, secretRef.current));
            }
        });
    },
    renew: async () => {
        await run(async () => {
            if (box !== null) {
                apply(await renewBoxLink(box.id, secretRef.current));
            }
        });
    },
    remove: async () => {
        await run(async () => {
            if (box !== null) {
                await deleteBox(box.id, secretRef.current);
                forget();
                apply(null);
            }
        });
    },
    hideCards: async (hidden) => {
        await run(async () => {
            if (box !== null) {
                apply(
                    await updateBox(box.id, secretRef.current, {
                        cardsHidden: hidden,
                    }),
                );
            }
        });
    },
    resolve: async (contributionId, decision, parts) => {
        const done = await run(async () => {
            if (box !== null) {
                apply(
                    await resolveContribution(
                        box.id,
                        contributionId,
                        secretRef.current,
                        decision,
                        parts,
                    ),
                );
            }
        });
        if (!done) {
            throw new Error('box action failed');
        }
    },
});

/**
 * The collection box of the open edition ("Samen maken", B128). Without an account the browser holds the owner
 * secret; with one the account owns the box, so a second device finds it too. A box is only looked at when this
 * edition has one. While the editor is open it follows the box live (Reverb) and with a slow poll.
 */
export const useCollectionBox = (
    edition: Edition,
    loggedIn: boolean,
): CollectionBox => {
    const editionId = edition.id;
    const [box, setBox] = useState<OwnerBox | null>(null);
    const { secretRef, secret, remember } = useOwnerSecret();
    const { busy, error, setError, errorReason, run } = useBoxAction();
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
    }, [apply, editionId, secretRef, setError]);

    const loaded = useFirstLook(editionId, loggedIn, apply, remember, setError);
    useFollowBox(box?.channel, box?.id, refresh);

    const start = useCallback(async () => {
        await run(async () => {
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
                remember(created.ownerSecret);
            }
            const { ownerSecret, ...owned } = created;
            void ownerSecret;
            apply(owned);
        });
    }, [run, edition, editionId, apply, remember]);

    useSnapshotUpdate(edition, box?.id, secretRef);
    const actions = useBoxActions(
        box,
        secretRef,
        () => forgetOwnerRecord(editionId),
        apply,
        run,
    );

    return {
        box,
        loaded,
        busy,
        error,
        errorReason,
        secret,
        start,
        refresh,
        ...actions,
    };
};
