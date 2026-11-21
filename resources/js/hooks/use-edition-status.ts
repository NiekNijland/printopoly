import { useEffect, useState } from 'react';

import { fetchBox, findAccountBox } from '@/lib/boxes/api';
import { readOwnerRecord } from '@/lib/boxes/local';
import type { EditionSummary } from '@/lib/edition/types';
import { index as printReady } from '@/routes/api/print-ready';
import type { EditionPrintReadyData } from '@/types/generated';

/** What is waiting on an edition, for the lines on its card in Mijn edities. Everything is optional: no answer, no line. */
export interface EditionStatus {
    /** Contributions of friends that wait for a decision. */
    contributions: number;
    /** Until when the link of an open "Samen maken" box works, in ms. */
    boxUntil: number | null;
    printer: SetStatus;
    home: SetStatus;
}

interface SetStatus {
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
): Record<string, EditionStatus> {
    const [status, setStatus] = useState<Record<string, EditionStatus>>({});
    const key = (editions ?? []).map((edition) => edition.id).join(',');
    const accountKey = accountIds === null ? '' : [...accountIds].join(',');

    useEffect(() => {
        let alive = true;
        const wanted = key === '' ? [] : key.split(',');
        const inAccount = new Set(
            accountKey === '' ? [] : accountKey.split(','),
        );

        async function load(): Promise<void> {
            const ready = loggedIn
                ? await readPrintReady().catch(
                      (): Map<string, EditionPrintReadyData> => new Map(),
                  )
                : new Map<string, EditionPrintReadyData>();
            const next: Record<string, EditionStatus> = {};

            await Promise.all(
                wanted.map(async (id) => {
                    const box = await readBox(id, inAccount.has(id));
                    const files = ready.get(id);

                    next[id] = {
                        contributions: box?.contributions.length ?? 0,
                        boxUntil:
                            box !== null && box.status === 'open'
                                ? box.expiresAt
                                : null,
                        printer: {
                            readyUntil: files?.printerReadyUntil ?? null,
                            outdated: files?.printerOutdated ?? false,
                        },
                        home: {
                            readyUntil: files?.homeReadyUntil ?? null,
                            outdated: files?.homeOutdated ?? false,
                        },
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
    }, [key, accountKey, loggedIn]);

    return status;
}
