import { useEffect, useState } from 'react';

import { fetchBox, findAccountBox } from '@/features/edition/boxes/api';
import { readOwnerRecord } from '@/features/edition/boxes/local';
import type { OwnerBox } from '@/features/edition/boxes/types';
import { isJsonObject } from '@/features/edition/remote/client';
import { reportAndReturn, reportUnlessOffline } from '@/lib/bugsnag';
import { sendRequest } from '@/lib/http';
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
    PrintSet,
} from '@/types/generated';

/** What is waiting on an edition, for the lines on its card in Mijn edities. Everything is optional: no answer, no line. */
export type EditionStatus = {
    /** Contributions of friends that wait for a decision. */
    contributions: number;
    /** Until when the link of an open "Samen maken" box works, in ms. */
    boxUntil: number | null;
    printer: SetStatus;
    home: SetStatus;
};

type SetStatus = {
    /** The set is made and current: when the first file goes away, in ms. */
    readyUntil: number | null;
    /** The edition changed after files were made. */
    outdated: boolean;
};

const MAX_TOKENS_PER_REQUEST = 50;

const NONE: SetStatus = { readyUntil: null, outdated: false };

export const NO_STATUS: EditionStatus = {
    contributions: 0,
    boxUntil: null,
    printer: NONE,
    home: NONE,
};

const isPrintReady = (value: unknown): value is EditionPrintReadyData =>
    isJsonObject(value) &&
    typeof value.editionId === 'string' &&
    (value.printerReadyUntil === null ||
        typeof value.printerReadyUntil === 'number') &&
    typeof value.printerOutdated === 'boolean' &&
    (value.homeReadyUntil === null ||
        typeof value.homeReadyUntil === 'number') &&
    typeof value.homeOutdated === 'boolean';

const readPrintReady = async (): Promise<
    Map<string, EditionPrintReadyData>
> => {
    const response = await sendRequest(printReady().url, {
        headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
        return new Map();
    }
    const body: unknown = await response.json();
    const editions =
        isJsonObject(body) && Array.isArray(body.editions)
            ? body.editions.filter(isPrintReady)
            : [];

    return new Map(editions.map((item) => [item.editionId, item]));
};

/**
 * The jobs this browser made for its editions without an account, with what the server says is ready. The
 * server only answers for tokens it was sent, so nothing is asked when there are none. Never throws.
 */
const readLocalJobs = async (
    storage: Pick<EditionStorage, 'listPrintJobs'> | undefined,
): Promise<{
    jobs: PrintJobRecord[];
    ready: Map<string, PrintJobReadyData>;
}> => {
    try {
        const jobs = (await storage?.listPrintJobs()) ?? [];

        if (jobs.length === 0) {
            return { jobs, ready: new Map() };
        }
        const tokens = jobs.map((job) => job.token);
        const answers: PrintJobReadyData[] = [];
        for (
            let start = 0;
            start < tokens.length;
            start += MAX_TOKENS_PER_REQUEST
        ) {
            answers.push(
                ...(await fetchPrintJobsReady(
                    printJobsReady().url,
                    tokens.slice(start, start + MAX_TOKENS_PER_REQUEST),
                )),
            );
        }

        return {
            jobs,
            ready: new Map(answers.map((answer) => [answer.token, answer])),
        };
    } catch (error) {
        reportUnlessOffline(error);

        return { jobs: [], ready: new Map() };
    }
};

/**
 * The state of one set from the jobs of one edition, newest first: the newest job with the set ready counts. A
 * job made before the edition changed is outdated, as the server says for an edition in an account.
 */
const localSetStatus = (
    set: PrintSet,
    revision: number,
    jobs: readonly PrintJobRecord[],
    ready: ReadonlyMap<string, PrintJobReadyData>,
): SetStatus => {
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
};

/** The box of an edition: with the owner secret of this browser, else through the account. Never throws. */
const readBox = async (
    id: string,
    inAccount: boolean,
): Promise<OwnerBox | null> => {
    try {
        const record = readOwnerRecord(id);

        if (record !== null) {
            return await fetchBox(record.id, record.secret);
        }

        return inAccount ? await findAccountBox(id) : null;
    } catch (error) {
        reportUnlessOffline(error);

        return null;
    }
};

const statusOf = (
    box: OwnerBox | null,
    files: EditionPrintReadyData | undefined,
    revision: number,
    jobs: readonly PrintJobRecord[],
    ready: ReadonlyMap<string, PrintJobReadyData>,
): EditionStatus => {
    // The account knows the jobs it made; the browser the jobs it made without one.
    const set = (
        which: PrintSet,
        readyUntil: number | null | undefined,
        outdated: boolean | undefined,
    ): SetStatus =>
        (readyUntil ?? null) !== null || outdated === true
            ? {
                  readyUntil: readyUntil ?? null,
                  outdated: outdated ?? false,
              }
            : localSetStatus(which, revision, jobs, ready);

    return {
        contributions: box?.contributions.length ?? 0,
        boxUntil: box !== null && box.status === 'open' ? box.expiresAt : null,
        printer: set(
            'printer',
            files?.printerReadyUntil,
            files?.printerOutdated,
        ),
        home: set('home', files?.homeReadyUntil, files?.homeOutdated),
    };
};

/**
 * The status lines of Mijn edities (B95, B128): friends' contributions that wait, and the PDFs that were made
 * (they stay 7 days). The list shows at once; the lines come in when the server has answered.
 */
export const useEditionStatus = (
    editions: EditionSummary[] | null,
    loggedIn: boolean,
    accountIds: ReadonlySet<string> | null,
    /** Where this browser keeps the print jobs of its editions without an account. */
    storage?: Pick<EditionStorage, 'listPrintJobs'>,
): Record<string, EditionStatus> => {
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

        const load = async (): Promise<void> => {
            const [ready, local] = await Promise.all([
                loggedIn
                    ? readPrintReady().catch(
                          reportAndReturn(
                              new Map<string, EditionPrintReadyData>(),
                          ),
                      )
                    : new Map<string, EditionPrintReadyData>(),
                readLocalJobs(storage),
            ]);
            const next: Record<string, EditionStatus> = {};

            await Promise.all(
                wanted.map(async ({ id, revision }) => {
                    const box = await readBox(id, inAccount.has(id));
                    next[id] = statusOf(
                        box,
                        ready.get(id),
                        revision,
                        local.jobs.filter((job) => job.editionId === id),
                        local.ready,
                    );
                }),
            );

            if (alive) {
                setStatus(next);
            }
        };

        void load();

        return () => {
            alive = false;
        };
    }, [key, accountKey, loggedIn, storage]);

    return status;
};
