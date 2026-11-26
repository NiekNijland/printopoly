import { useEffect, useState } from 'react';

import { fetchBox, findAccountBox } from '@/features/edition/boxes/api';
import { readOwnerRecord } from '@/features/edition/boxes/local';
import type { EditionStorage } from '@/lib/render/edition-storage';
import type {
    EditionSummary,
    PrintJobRecord,
} from '@/lib/render/edition-types';
import { fetchPrintJobsReady } from '@/lib/render/print-api';
import { index as printReady } from '@/routes/api/print-ready';
import { ready as printJobsReady } from '@/routes/print-jobs';
import type {
    EditionPrintReadyData,
    PrintJobReadyData,
} from '@/types/generated';

/** What is waiting on an edition, for the lines on its card in Mijn edities. Everything is optional: no answer, no line. */
export interface EditionStatus {
    /** Contributions of friends that wait for a decision. */
    contributions: number;
    /** Until when the link of an open "Samen maken" box works, in ms. */
    boxUntil: number | null;
    printer: SetStatus;
    home: SetStatus;
}

export interface SetStatus {
    /** The set is made and current: when the first file goes away, in ms. */
    readyUntil: number | null;
    /** The edition changed after files were made. */
    outdated: boolean;
}

const NONE: SetStatus = { readyUntil: null, outdated: false };

export const NO_STATUS: EditionStatus = {
    contributions: 0,
    boxUntil: null,
    printer: NONE,
    home: NONE,
};

async function readPrintReady(): Promise<Map<string, EditionPrintReadyData>> {
    const response = await fetch(printReady().url, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });

    if (!response.ok) {
        return new Map();
    }
    const body = (await response.json()) as {
        editions: EditionPrintReadyData[];
    };

    return new Map(body.editions.map((item) => [item.editionId, item]));
}

/**
 * The jobs this browser made for its editions without an account, with what the server says is ready. The
 * server only answers for tokens it was sent, so nothing is asked when there are none. Never throws.
 */
async function readLocalJobs(
    storage: Pick<EditionStorage, 'listPrintJobs'> | undefined,
): Promise<{
    jobs: PrintJobRecord[];
    ready: Map<string, PrintJobReadyData>;
}> {
    try {
        const jobs = (await storage?.listPrintJobs()) ?? [];

        if (jobs.length === 0) {
            return { jobs, ready: new Map() };
        }
        const answers = await fetchPrintJobsReady(
            printJobsReady().url,
            jobs.map((job) => job.token),
        );

        return {
            jobs,
            ready: new Map(answers.map((answer) => [answer.token, answer])),
        };
    } catch {
        return { jobs: [], ready: new Map() };
    }
}

/**
 * The state of one set from the jobs of one edition, newest first: the newest job with the set ready counts. A
 * job made before the edition changed is outdated, as the server says for an edition in an account.
 */
export function localSetStatus(
    set: 'printer' | 'home',
    revision: number,
    jobs: readonly PrintJobRecord[],
    ready: ReadonlyMap<string, PrintJobReadyData>,
): SetStatus {
    const newest = [...jobs]
        .sort((a, b) => b.createdAt - a.createdAt)
        .find((job) => {
            const answer = ready.get(job.token);

            return (
                ((set === 'printer'
                    ? answer?.printerReadyUntil
                    : answer?.homeReadyUntil) ?? null) !== null
            );
        });
    const answer = newest === undefined ? undefined : ready.get(newest.token);
    const until =
        (set === 'printer'
            ? answer?.printerReadyUntil
            : answer?.homeReadyUntil) ?? null;

    if (newest === undefined || until === null) {
        return NONE;
    }

    return newest.revision === revision
        ? { readyUntil: until, outdated: false }
        : { readyUntil: null, outdated: true };
}

/** The box of an edition: with the owner secret of this browser, else through the account. Never throws. */
async function readBox(id: string, inAccount: boolean) {
    try {
        const record = readOwnerRecord(id);

        if (record !== null) {
            return await fetchBox(record.id, record.secret);
        }

        return inAccount ? await findAccountBox(id) : null;
    } catch {
        return null;
    }
}

/**
 * The status lines of Mijn edities (B95, B128): friends' contributions that wait, and the PDFs that were made
 * (they stay 7 days). The list shows at once; the lines come in when the server has answered.
 */
export function useEditionStatus(
    editions: EditionSummary[] | null,
    loggedIn: boolean,
    accountIds: ReadonlySet<string> | null,
    /** Where this browser keeps the print jobs of its editions without an account. */
    storage?: Pick<EditionStorage, 'listPrintJobs'>,
): Record<string, EditionStatus> {
    const [status, setStatus] = useState<Record<string, EditionStatus>>({});
    const key = (editions ?? [])
        .map((edition) => `${edition.id}:${String(edition.revision)}`)
        .join(',');
    const accountKey = accountIds === null ? '' : [...accountIds].join(',');

    useEffect(() => {
        let alive = true;
        const wanted = (key === '' ? [] : key.split(',')).map((item) => {
            const at = item.lastIndexOf(':');

            return {
                id: item.slice(0, at),
                revision: Number(item.slice(at + 1)),
            };
        });
        const inAccount = new Set(
            accountKey === '' ? [] : accountKey.split(','),
        );

        async function load(): Promise<void> {
            const [ready, local] = await Promise.all([
                loggedIn
                    ? readPrintReady().catch(
                          (): Map<string, EditionPrintReadyData> => new Map(),
                      )
                    : new Map<string, EditionPrintReadyData>(),
                readLocalJobs(storage),
            ]);
            const next: Record<string, EditionStatus> = {};

            await Promise.all(
                wanted.map(async ({ id, revision }) => {
                    const box = await readBox(id, inAccount.has(id));
                    const files = ready.get(id);
                    const jobs = local.jobs.filter(
                        (job) => job.editionId === id,
                    );
                    // The account knows the jobs it made; the browser the jobs it made without one.
                    const set = (
                        which: 'printer' | 'home',
                        readyUntil: number | null | undefined,
                        outdated: boolean | undefined,
                    ): SetStatus =>
                        (readyUntil ?? null) !== null || outdated === true
                            ? {
                                  readyUntil: readyUntil ?? null,
                                  outdated: outdated ?? false,
                              }
                            : localSetStatus(
                                  which,
                                  revision,
                                  jobs,
                                  local.ready,
                              );

                    next[id] = {
                        contributions: box?.contributions.length ?? 0,
                        boxUntil:
                            box !== null && box.status === 'open'
                                ? box.expiresAt
                                : null,
                        printer: set(
                            'printer',
                            files?.printerReadyUntil,
                            files?.printerOutdated,
                        ),
                        home: set(
                            'home',
                            files?.homeReadyUntil,
                            files?.homeOutdated,
                        ),
                    };
                }),
            );

            if (alive) {
                setStatus(next);
            }
        }

        void load();

        return () => {
            alive = false;
        };
    }, [key, accountKey, loggedIn, storage]);

    return status;
}
