import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';

import { useChecks } from '@/components/editor/check-probe';
import { MoneyChoice } from '@/components/print/money-choice';
import { PartRow } from '@/components/print/part-row';
import { PartThumb } from '@/components/print/part-thumb';
import {
    PrintBar,
    type BarActivity,
    type BarProblem,
} from '@/components/print/print-bar';
import { REVIEW_ID, ReviewList } from '@/components/print/review-list';
import { Button } from '@/components/ui/button';
import {
    SegmentedTabs,
    SegmentedTabsList,
    SegmentedTabsTrigger,
} from '@/components/ui/segmented-tabs';
import { sampleEdition } from '@/data/sample-edition';
import { useSmallPhone } from '@/hooks/use-media-query';
import { useOnline } from '@/hooks/use-online';
import { usePrintJob } from '@/hooks/use-print-job';
import { usePrintQueue } from '@/hooks/use-print-queue';
import type { StartOutcome } from '@/hooks/use-print-queue';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';
import { usedPhotoIds } from '@/lib/edition/repository';
import type { Edition, PrintSelection } from '@/lib/edition/types';
import { PhotoCache } from '@/lib/editor/photo-cache';
import { getServices } from '@/lib/editor/services';
import {
    PrintApiError,
    fetchStatus,
    findReusableJob,
    previousJobToken,
    saveChoices,
    startRun,
    uploadPrintJob,
    type SetChoice,
    type UploadProgress,
} from '@/lib/print/api';
import {
    hasHouseRulesCard,
    moneyAmountOf,
    type PrintEdition,
} from '@/lib/print/composition';
import {
    describeEstimate,
    panelSize,
    partQuantity,
    setEstimate,
} from '@/lib/print/estimate';
import {
    carryPrintJob,
    loadLocalEdition,
    loadLocalEditionRecord,
    rememberPrintJob,
} from '@/lib/print/local-edition';
import { banknoteTotal, type MoneyAmount } from '@/lib/print/money';
import { photoTargets } from '@/lib/print/photo-targets';
import { cardCountOf, toEdition } from '@/lib/print/print-edition';
import {
    SET_PARTS,
    defaultPrintSelection,
    editionInSet,
    inPrintSelection,
    selectionFromSkipped,
    selectionOfRows,
    skippedOf,
    toggleSelectionPart,
    type SetPart,
} from '@/lib/print/selection';
import { index as editionsIndex } from '@/routes/editions';
import { show as editorShow } from '@/routes/editor';
import {
    choices as choicesRoute,
    generate,
    show as printShow,
} from '@/routes/print';
import { store as storePrintJob } from '@/routes/print-jobs';
import type {
    PrintJobData,
    PrintPart,
    PrintPartStatusData,
    PrintSet,
} from '@/types/generated';

interface PrintShowProps {
    /** Null on the page before a job exists: the edition lives in this browser. */
    job: PrintJobData | null;
    /** The id of the edition in this browser, on the page before a job exists. */
    localEditionId: string | null;
    edition: { name: string; cards: number; parts: PrintPart[] };
    /** The edition of the job, to draw the parts from. Null before a job exists: it lives in this browser. */
    editionData: PrintEdition | null;
}

/**
 * The parts of the game itself and the extra printing, in the order they sit on the page (B149). Every part is
 * always there as a row: the print page is the one place that chooses what goes in the set (B198). The dice and
 * the houses and hotels are gone (B200).
 */
const GAME_PARTS: SetPart[] = ['board', 'cards', 'money', 'tokens', 'box_lid'];
const EXTRA_PARTS: SetPart[] = ['invitation', 'rules_booklet'];

/** Seconds to wait after "too many requests" when the server does not say (bug 4 of test round 3). */
const THROTTLE_WAIT = 60;

/** What the page chose for one set: kept on the job, so a reload shows it again (bug 6 of test round 3). */
interface Choice {
    skipped: PrintPart[];
    /** Null keeps the choice of the edition, or the default of the set (B156). */
    moneyAmount: MoneyAmount | null;
    copies: number;
}

const NO_CHOICE: Choice = { skipped: [], moneyAmount: null, copies: 1 };

const SET_KEY = 'printopoly.print-set.';

/**
 * The tab to open: the set in `?set=` (set after making a set), so you land on the set you made; otherwise the
 * set this browser chose for the edition, and else the home set (B199). The edition itself keeps its choice in
 * `printSelection` too; the page switches to it once the edition has loaded (`setFromEdition`).
 */
export function initialSet(editionId: string | null): PrintSet {
    if (typeof window === 'undefined') {
        return 'home';
    }
    const asked = new URLSearchParams(window.location.search).get('set');
    if (asked !== null) {
        return asked === 'printer' ? 'printer' : 'home';
    }
    try {
        const own =
            editionId === null
                ? null
                : window.localStorage.getItem(SET_KEY + editionId);

        return own === 'printer' ? 'printer' : 'home';
    } catch {
        return 'home';
    }
}

/** Whether the address names a set, which then wins over what the edition remembers. */
function setInUrl(): boolean {
    return (
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).has('set')
    );
}

function rememberSet(editionId: string | null, set: PrintSet): void {
    try {
        if (editionId !== null) {
            window.localStorage.setItem(SET_KEY + editionId, set);
        }
    } catch {
        // Without storage the page opens on the home set, as for a new edition.
    }
}

function initialChoices(job: PrintJobData | null): Record<PrintSet, Choice> {
    const of = (set: PrintSet): Choice => {
        const kept = job?.choices[set];

        return kept === undefined
            ? NO_CHOICE
            : {
                  skipped: kept.skipped,
                  moneyAmount: kept.moneyAmount ?? null,
                  copies: kept.copies,
              };
    };

    return { printer: of('printer'), home: of('home') };
}

/** The edition as the page counts it: the parts it prints and the money chosen for the set. */
function printEditionOf(
    edition: Edition,
    moneyAmount: MoneyAmount,
): PrintEdition {
    return {
        parts: edition.parts,
        boardProfile: edition.boardProfile,
        moneyAmount,
        elements: edition.elements as unknown as PrintEdition['elements'],
    };
}

/**
 * The print page (B95, docs/design/Download.dc.html and Mobiel-download.dc.html). Nothing is made until the
 * user clicks "Drukkerij-set maken" or a single part; the explanation about the server sits directly above
 * that button. Status per part arrives live over Reverb.
 */
export default function PrintShow({
    job,
    edition,
    editionData,
    localEditionId,
}: PrintShowProps) {
    const t = useTranslation();
    const tc = useTranslationChoice();
    const { locale, pageUrls } = usePage().props;
    const { status, setStatus } = usePrintJob(job);
    const smallPhone = useSmallPhone();
    const [set, setSet] = useState<PrintSet>(() => initialSet(localEditionId));
    const [choices, setChoices] = useState(() => initialChoices(job));
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    /** "Too many requests": when the page tries again by itself, and what it tries (bug 4 of test round 3). */
    const [throttle, setThrottle] = useState<{
        until: number;
        retry: () => void;
    } | null>(null);
    const [now, setNow] = useState(() => Date.now());
    /** The parts of the request on its way to the server, so they cannot be asked for twice. */
    const [sending, setSending] = useState<{
        set: PrintSet;
        parts: PrintPart[];
    } | null>(null);
    /** Photos and bytes sent so far while the edition is uploaded for a new job; null when nothing is uploading. */
    const [uploading, setUploading] = useState<UploadProgress | null>(null);
    /** A request that failed because the connection was gone: it goes again once the browser is online (bug 12). */
    const [lost, setLost] = useState<{ retry: () => void } | null>(null);
    const online = useOnline();
    const [local, setLocal] = useState<Edition | null>(null);
    /** The latest `request`, for a throttled request that tries again later with the queue as it is then. */
    const retryRef = useRef<(forSet: PrintSet, chosen: PrintPart[]) => void>(
        () => undefined,
    );
    /** Before a job exists: whether this browser has one for this revision already (bug 9 of test round 3). */
    const [reusing, setReusing] = useState(job === null);
    /** What goes in the set, as chosen on this page; null until a tick changes it (B198). */
    const [chosen, setChosen] = useState<PrintSelection | null>(null);
    /** The choice could not be kept on the edition in this browser; printing goes on. */
    const [rememberFailed, setRememberFailed] = useState(false);
    /** The person switched sets here: the set the edition remembers no longer takes over. */
    const pickedSet = useRef(setInUrl());

    // Before a job exists the edition is in this browser (B80): draw the parts from it, or open the job this
    // browser already made for it when the edition has not changed since.
    useEffect(() => {
        if (job !== null) {
            return;
        }

        let cancelled = false;
        const { storage } = getServices(locale);

        loadLocalEditionRecord(localEditionId, locale)
            .then(async (found) => {
                if (cancelled || found === undefined) {
                    return null;
                }

                setLocal(found);

                return findReusableJob(found.id, found.revision, storage);
            })
            .then((token) => {
                if (cancelled) {
                    return;
                }

                if (token === null) {
                    setReusing(false);

                    return;
                }

                router.visit(printShow({ locale, printJob: token }).url, {
                    replace: true,
                });
            })
            .catch(() => {
                if (!cancelled) {
                    setReusing(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [job, localEditionId, locale]);

    const drawn = useMemo<Edition>(() => {
        if (editionData !== null) {
            return toEdition(editionData);
        }

        return (
            local ?? {
                ...sampleEdition(locale === 'en' ? 'en' : 'nl'),
                elements: {},
                name: '',
            }
        );
    }, [editionData, local, locale]);

    // The thumbnails show the photos of this browser (the editor keeps every photo here).
    const [cache] = useState(
        () => new PhotoCache((id) => getServices(locale).storage.getPhoto(id)),
    );
    const photos = useSyncExternalStore(cache.subscribe, cache.getSnapshot);

    // The edition as the editor has it, for the open Controle messages in the bar (UX 7, B179). On the page of a
    // job it is read from this browser as well; without it the bar says nothing about the Controle.
    const [stored, setStored] = useState<Edition | null>(null);
    useEffect(() => {
        if (job === null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- before a job the edition is `local`, loaded above
            setStored(null);

            return undefined;
        }
        if (localEditionId === null) {
            return undefined;
        }
        let cancelled = false;
        loadLocalEditionRecord(localEditionId, locale)
            .then((found) => {
                if (!cancelled) {
                    setStored(found ?? null);
                }
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [job, localEditionId, locale]);
    const checked = job === null ? local : stored;

    // Once the edition of this browser has loaded, open on the set it remembers (B199), unless the address or the
    // person chose one already.
    const rememberedSet = checked?.printSelection?.set;
    useEffect(() => {
        if (rememberedSet !== undefined && !pickedSet.current) {
            pickedSet.current = true;
            setSet(rememberedSet);
        }
    }, [rememberedSet]);

    useEffect(() => {
        cache.request([
            ...new Set([
                ...usedPhotoIds(drawn.elements),
                ...(checked === null ? [] : usedPhotoIds(checked.elements)),
            ]),
        ]);
    }, [cache, drawn, checked]);

    useEffect(() => {
        return () => {
            cache.dispose();
        };
    }, [cache]);

    // The countdown of "too many requests"; at zero the page tries again by itself.
    useEffect(() => {
        if (throttle === null) {
            return;
        }

        const timer = window.setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => {
            window.clearInterval(timer);
        };
    }, [throttle]);

    useEffect(() => {
        if (throttle !== null && now >= throttle.until) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- the wait is over, which only the clock tells
            setThrottle(null);
            throttle.retry();
        }
    }, [now, throttle]);

    // Back online: catch up on what the server did meanwhile, and send what could not go (bug 12 of test round 4).
    const wasOnline = useRef(online);
    useEffect(() => {
        const cameBack = online && !wasOnline.current;
        wasOnline.current = online;

        if (!online) {
            return;
        }

        if (lost !== null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- the connection is back, which only the browser tells
            setLost(null);
            lost.retry();
        }

        // Live messages sent while offline are gone: ask the server once where things stand.
        if (cameBack && job !== null) {
            fetchStatus(job.statusUrl)
                .then(setStatus)
                .catch(() => undefined);
        }
    }, [online, lost, job, setStatus]);

    const choice = choices[set];
    const moneyAmount = choice.moneyAmount ?? moneyAmountOf(drawn, set);
    const counted = useMemo(
        () => printEditionOf(drawn, moneyAmount),
        [drawn, moneyAmount],
    );

    // What goes in the set (B198): the choice made here, else the one the edition keeps, else what the job skipped
    // (a job page in a browser without the edition), else the parts the edition had switched on.
    const kept = job?.choices[set];
    const serverParts = edition.parts;
    const selection = useMemo<PrintSelection>(() => {
        if (chosen !== null) {
            return chosen;
        }
        if (checked?.printSelection !== undefined) {
            return checked.printSelection;
        }
        // Before a job the edition says which parts it had on; on the page of a job the server says which parts the
        // uploaded edition had in its set, less what the job skips since.
        const base =
            job === null
                ? { ...defaultPrintSelection(drawn), set }
                : selectionOfRows(
                      set,
                      SET_PARTS.filter((part) =>
                          (serverParts as readonly string[]).includes(part),
                      ),
                  );

        return kept === undefined
            ? base
            : selectionFromSkipped(base, kept.skipped, set);
    }, [chosen, checked, kept, drawn, set, job, serverParts]);
    // Only the parts in the set give messages, the same as in the editor (B197).
    const inSet = useMemo(
        () => editionInSet(checked ?? drawn, selection),
        [checked, drawn, selection],
    );
    const { issues, probe } = useChecks(inSet, photos);
    const parts: SetPart[] = [...GAME_PARTS, ...EXTRA_PARTS];
    const cardCount = job === null ? cardCountOf(drawn) : edition.cards;
    const selected: PrintPart[] = parts.filter((part) =>
        inPrintSelection(selection, part),
    );
    const rowFor = (
        part: PrintPart,
        forSet: PrintSet,
    ): PrintPartStatusData | undefined => {
        const found = status.parts.find(
            (row) =>
                row.part === part &&
                row.set === (part === 'calibration' ? 'home' : forSet),
        );

        // On its way to the server: it waits like the parts of a run that has started.
        if (
            sending !== null &&
            sending.parts.includes(part) &&
            (part === 'calibration' || sending.set === forSet)
        ) {
            return {
                set: part === 'calibration' ? 'home' : forSet,
                part,
                status: 'waiting',
                waitingFor: null,
                pages: null,
                bytes: null,
                downloadUrl: null,
                instructionsUrl: null,
                reason: null,
                imageUrl: null,
            };
        }

        return found;
    };
    const anyMade = status.parts.some(
        (row) =>
            (parts as readonly PrintPart[]).includes(row.part) &&
            row.set === set &&
            row.status !== 'idle',
    );
    // Before a job exists the first click uploads the edition and opens the job's page; nothing queues then.
    const uploadingFirst = job === null && (working || reusing);
    const zipReady =
        set === 'printer' ? status.printerZipReady : status.homeZipReady;
    const zipUrl = set === 'printer' ? status.printerZipUrl : status.homeZipUrl;
    const days = job?.retentionDays ?? 7;

    /** The choices of a set as they travel to the server. */
    const choiceToSend = useCallback(
        (forSet: PrintSet): SetChoice => ({
            // What goes in the set is one choice for the edition (B198), the same for both sets.
            skipped: skippedOf(selection),
            moneyAmount: choices[forSet].moneyAmount,
            copies: choices[forSet].copies,
        }),
        [choices, selection],
    );

    const make = useCallback(
        async (
            forSet: PrintSet,
            chosen: PrintPart[],
        ): Promise<StartOutcome> => {
            setWorking(true);
            setSending({ set: forSet, parts: chosen });
            setError(null);

            try {
                if (job === null) {
                    const local = await loadLocalEdition(
                        localEditionId,
                        locale,
                    );

                    if (local === null) {
                        setError(t('print.no_edition'));

                        return 'failed';
                    }

                    // A job without an account: the browser sends the edition and its photos once (B80). The job of
                    // an earlier version goes along, so the PDFs that did not change are taken over (UX 3).
                    const created = await uploadPrintJob(
                        {
                            ...local,
                            previous: await previousJobToken(
                                local.edition.id,
                                getServices(locale).storage,
                            ),
                        },
                        storePrintJob().url,
                        setUploading,
                    );
                    setUploading(null);
                    await rememberPrintJob(
                        local.edition,
                        created.token,
                        getServices(locale).storage,
                    );
                    // The choices go with the first run, so the job page counts the same parts (bug 6).
                    await startRun(
                        generate({ printJob: created.token }).url,
                        forSet,
                        chosen,
                        undefined,
                        choiceToSend(forSet),
                        locale,
                    );
                    router.visit(`${created.url}?set=${forSet}`);

                    return 'started';
                }

                // The frame of every photo comes from the renderers, so the browser says how large it is (B61).
                const targets =
                    editionData === null
                        ? undefined
                        : photoTargets(toEdition(editionData));

                setStatus(
                    await startRun(
                        job.generateUrl,
                        forSet,
                        chosen,
                        targets,
                        choiceToSend(forSet),
                        locale,
                    ),
                );

                return 'started';
            } catch (caught) {
                const code =
                    caught instanceof PrintApiError ? caught.status : 0;

                // A run is still going on the server: the parts stay in line and start after it.
                if (code === 409 && job !== null) {
                    return 'busy';
                }

                // No connection: say so in the bar and send it again as soon as the browser is online (bug 12).
                if (
                    !(caught instanceof PrintApiError) &&
                    caught instanceof TypeError
                ) {
                    setLost({
                        retry: () => {
                            retryRef.current(forSet, chosen);
                        },
                    });

                    return 'failed';
                }

                // Too many requests from this address: say so next to the button and try again by itself.
                if (code === 429 && caught instanceof PrintApiError) {
                    setThrottle({
                        until:
                            Date.now() +
                            (caught.retryAfter ?? THROTTLE_WAIT) * 1000,
                        retry: () => {
                            retryRef.current(forSet, chosen);
                        },
                    });
                    setNow(Date.now());

                    return 'failed';
                }

                setError(
                    code === 409
                        ? t('print.error_busy')
                        : code === 422
                          ? t('print.error_photos')
                          : t('print.error_generic'),
                );

                return 'failed';
            } finally {
                setWorking(false);
                setSending(null);
                setUploading(null);
            }
        },
        [choiceToSend, editionData, job, locale, localEditionId, setStatus, t],
    );

    // A part asked for while a run is going waits in this browser and starts right after it.
    const { queue, isQueued, enqueue, remove } = usePrintQueue(
        job !== null && !working && !status.busy && throttle === null,
        make,
    );
    const isActive = (part: PrintPart, forSet: PrintSet): boolean => {
        const shown = rowFor(part, forSet)?.status;

        return shown === 'waiting' || shown === 'running';
    };

    function request(forSet: PrintSet, chosen: PrintPart[]): void {
        const wanted = chosen.filter(
            (part) => !isActive(part, forSet) && !isQueued(forSet, part),
        );

        if (wanted.length === 0) {
            return;
        }

        setError(null);

        if (job === null) {
            void make(forSet, wanted);

            return;
        }

        enqueue(forSet, wanted);
    }

    useEffect(() => {
        retryRef.current = request;
    });

    /** Changes the choice of one set, and keeps it on the job when there is one. */
    function choose(forSet: PrintSet, change: Partial<Choice>): void {
        const next = { ...choices[forSet], ...change };

        setChoices((current) => ({ ...current, [forSet]: next }));

        if (job === null) {
            return;
        }

        void saveChoices(
            choicesRoute({ printJob: job.token }).url,
            forSet,
            change,
        )
            .then(setStatus)
            .catch(() => undefined);
    }

    /**
     * Keeps what goes in the set on the edition in this browser (B198), where the editor reads it. A job made for
     * the edition as it was stays the job for it: the choice of parts does not change what is printed on them.
     */
    function remember(next: PrintSelection): void {
        const id = checked?.id;

        if (id === undefined) {
            return;
        }

        const { repository, storage } = getServices(locale);
        const before = checked?.revision ?? 0;

        repository
            .setPrintSelection(id, next)
            .then(async (saved) => {
                if (saved === undefined) {
                    return;
                }
                if (job === null) {
                    setLocal(saved);
                } else {
                    setStored(saved);
                    await carryPrintJob(
                        storage,
                        job.token,
                        id,
                        before,
                        saved.revision,
                    );
                }
                setRememberFailed(false);
            })
            .catch(() => {
                setRememberFailed(true);
            });
    }

    /** Ticks a part in or out of the set: for both sets on the job, and on the edition. The board stays in. */
    function togglePart(part: SetPart): void {
        const next = { ...toggleSelectionPart(selection, part), set };
        const skippedNow = skippedOf(next);

        setChosen(next);
        choose('printer', { skipped: skippedNow });
        choose('home', { skipped: skippedNow });
        remember(next);
    }

    function switchSet(next: PrintSet): void {
        pickedSet.current = true;
        setSet(next);
        rememberSet(localEditionId, next);

        const moved = { ...selection, set: next };
        setChosen(moved);
        remember(moved);
    }

    const name = edition.name === '' ? drawn.name : edition.name;
    const editorHref =
        localEditionId === null
            ? editionsIndex(locale)
            : editorShow({ locale, edition: localEditionId });
    const doneCount = selected.filter(
        (part) => rowFor(part, set)?.status === 'done',
    ).length;
    const allDone = selected.length > 0 && doneCount === selected.length;
    // What the set button would still add: the chosen parts that are not made, going or in line already.
    const setLeft = selected.filter(
        (part) =>
            !isActive(part, set) &&
            !isQueued(set, part) &&
            rowFor(part, set)?.status !== 'done',
    );
    const setBusy =
        working ||
        status.busy ||
        throttle !== null ||
        queue.some((entry) => entry.set === set);

    // How much the set takes, before anything is made (UX 3 of test round 3).
    const quantities = selected.map((part) => ({
        part,
        quantity: partQuantity(part, set, counted),
    }));
    const estimate = describeEstimate(
        setEstimate(quantities, choice.copies),
        choice.copies,
        t,
        tc,
        selected.includes('money')
            ? banknoteTotal(moneyAmount) * choice.copies
            : 0,
    );

    /** The spec line of a row, counted from the edition: sheets, notes and the size of the panels (bug 22). */
    const specOf = (part: PrintPart): string | undefined => {
        const quantity = partQuantity(part, set, counted);

        switch (part) {
            case 'board': {
                const panel = panelSize(drawn.boardProfile);

                return set === 'printer'
                    ? t('print.spec.printer.board', {
                          panels: panel.count,
                          w: formatMm(panel.w, locale),
                          h: formatMm(panel.h, locale),
                      })
                    : t('print.spec.home.board', { sheets: quantity.count });
            }
            case 'money':
                // More than one set: the notes for all of them, so a club knows what it gets (UX 3 of test round 4).
                return choice.copies > 1
                    ? t(`print.spec.${set}.money_sets`, {
                          notes: banknoteTotal(moneyAmount),
                          total: banknoteTotal(moneyAmount) * choice.copies,
                          copies: choice.copies,
                          sheets: quantity.count,
                      })
                    : t(`print.spec.${set}.money`, {
                          notes: banknoteTotal(moneyAmount),
                          sheets: quantity.count,
                      });
            case 'box_lid':
                return set === 'printer'
                    ? t('print.spec.printer.box_lid', {
                          w: formatMm(drawn.boardProfile.boxLid.w, locale),
                          h: formatMm(drawn.boardProfile.boxLid.h, locale),
                      })
                    : undefined;
            default:
                return undefined;
        }
    };

    const rowOf = (part: SetPart, index: number) => (
        <PartRow
            key={part}
            set={set}
            part={part}
            row={rowFor(part, set)}
            included={inPrintSelection(selection, part)}
            locked={part === 'board'}
            guideHref={`${pageUrls.printGuide}#part-${part}`}
            onToggle={() => {
                togglePart(part);
            }}
            onMake={() => {
                request(set, [part]);
            }}
            queued={isQueued(set, part)}
            onUnqueue={() => {
                remove(set, part);
            }}
            disabled={uploadingFirst}
            cards={cardCount}
            edition={drawn}
            photos={photos}
            index={index}
            spec={specOf(part)}
            {...(part === 'cards' && hasHouseRulesCard(drawn)
                ? { note: t('print.house_rules_line') }
                : {})}
        >
            {part === 'money' ? (
                <MoneyChoice
                    value={choice.moneyAmount}
                    perSet={t('print.money.recommended')}
                    {...(choice.moneyAmount === null &&
                    drawn.moneyAmount === undefined
                        ? { note: t(`print.money.recommended_for.${set}`) }
                        : {})}
                    disabled={isActive('money', set)}
                    onChange={(amount) => {
                        choose(set, { moneyAmount: amount });
                    }}
                />
            ) : undefined}
        </PartRow>
    );

    const throttleSeconds =
        throttle === null
            ? 0
            : Math.max(0, Math.ceil((throttle.until - now) / 1000));
    const offlineNow = !online || lost !== null || uploading?.offline === true;
    const problem: BarProblem | null = offlineNow
        ? {
              message: t('print.offline'),
              seconds: null,
              ...(lost === null || !online
                  ? {}
                  : {
                        onRetryNow: () => {
                            setLost(null);
                            lost.retry();
                        },
                    }),
          }
        : throttle !== null
          ? {
                message: t('print.throttled', { seconds: throttleSeconds }),
                seconds: throttleSeconds,
                onRetryNow: () => {
                    setThrottle(null);
                    throttle.retry();
                },
            }
          : error !== null
            ? { message: error, seconds: null }
            : null;

    // What is happening right now, next to the button (bug 11 of test round 4): the upload with its photos and
    // megabytes, or the edition being set up.
    const activity: BarActivity | null = !working
        ? null
        : uploading === null || uploading.total === 0
          ? { message: t('print.starting'), fraction: null }
          : {
                message: t('print.uploading', {
                    done: uploading.done,
                    total: uploading.total,
                    sent: formatMegabytes(uploading.sentBytes, locale),
                    size: formatMegabytes(uploading.totalBytes, locale),
                }),
                fraction:
                    uploading.totalBytes === 0
                        ? null
                        : uploading.sentBytes / uploading.totalBytes,
            };

    return (
        <>
            <Head title={t('print.title')} />
            {checked !== null && probe}
            <div className="flex flex-col">
                {/* The edition on the table: its board as a proof, the name, the way back and the choice of set. */}
                <header className="border-b-2 border-ink bg-board">
                    <div className="mx-auto flex max-w-content flex-col gap-4 px-4 py-6 md:px-8 md:py-8 lg:flex-row lg:items-center lg:gap-8">
                        <div className="flex items-center gap-4 md:contents">
                            <span
                                aria-hidden="true"
                                className="flex size-16 flex-none -rotate-2 items-center justify-center border border-line-strong bg-card shadow-print md:size-32"
                            >
                                <span className="hidden md:block">
                                    <PartThumb
                                        part="board"
                                        edition={drawn}
                                        size={124}
                                        photos={photos}
                                    />
                                </span>
                                <span className="md:hidden">
                                    <PartThumb
                                        part="board"
                                        edition={drawn}
                                        size={60}
                                        photos={photos}
                                    />
                                </span>
                            </span>
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <Link
                                    href={editorHref}
                                    className="-my-1.5 inline-flex min-h-11 items-center self-start text-sm font-semibold no-underline hover:text-press"
                                >
                                    ‹ {t('print.back_to_editor')}
                                </Link>
                                <h1 className="m-0 font-display text-2xl leading-none font-extrabold [overflow-wrap:anywhere] md:text-hero">
                                    {name === ''
                                        ? t('print.title')
                                        : t('print.heading', { name })}
                                </h1>
                                <p className="m-0 hidden text-ink-soft md:block">
                                    {tc('print.meta', selected.length, {
                                        parts: selected.length,
                                        cards: cardCount,
                                    })}
                                </p>
                            </div>
                        </div>
                        {/* Which set suits which shop, right above the choice (B185). */}
                        <div className="flex min-w-0 flex-col gap-2 md:max-w-md lg:max-w-sm lg:flex-none lg:self-end">
                            <p id="print-set-hint" className="sr-only">
                                {t('print.set_hint')}
                            </p>
                            {/* Each set names its shop right above its own tab. */}
                            {/* The home set first: most people print at home or at a copy shop (B199). */}
                            <div
                                aria-hidden="true"
                                className="grid grid-cols-2 gap-2 text-center text-xs leading-tight font-semibold text-ink-soft"
                            >
                                <span>{t('print.set_for.home')}</span>
                                <span>{t('print.set_for.printer')}</span>
                            </div>
                            <SegmentedTabs
                                value={set}
                                onValueChange={(value) => {
                                    switchSet(
                                        value === 'printer'
                                            ? 'printer'
                                            : 'home',
                                    );
                                }}
                            >
                                <SegmentedTabsList
                                    aria-label={t('print.set_tabs')}
                                    aria-describedby="print-set-hint"
                                >
                                    <SegmentedTabsTrigger value="home">
                                        {t('print.set.home')}
                                    </SegmentedTabsTrigger>
                                    <SegmentedTabsTrigger value="printer">
                                        {t('print.set.printer')}
                                    </SegmentedTabsTrigger>
                                </SegmentedTabsList>
                            </SegmentedTabs>
                        </div>
                    </div>
                </header>

                <div className="mx-auto flex w-full max-w-content flex-col gap-4 px-4 pt-8 pb-12 md:px-8 md:pt-10 md:pb-16">
                    {/* The step before printing (B197): what the Controle still has open, each with a way to it. */}
                    {checked !== null && (
                        <ReviewList
                            issues={issues}
                            edition={checked}
                            locale={locale === 'en' ? 'en' : 'nl'}
                        />
                    )}

                    <section
                        aria-label={t('print.title')}
                        className="flex min-w-0 flex-col gap-4"
                    >
                        <p className="m-0 max-w-prose">
                            {t(`print.intro.${set}`)}{' '}
                            {/* The guide explains each part; the page does not repeat it (B205). */}
                            <Link
                                href={pageUrls.printGuide}
                                className="font-semibold underline underline-offset-4 hover:text-press"
                            >
                                {t('print.guide_note')}
                            </Link>
                        </p>

                        {rememberFailed && (
                            <p
                                role="status"
                                className="m-0 text-sm font-semibold text-ink-soft"
                            >
                                {t('print.remember_failed')}
                            </p>
                        )}

                        {job === null && reusing && local !== null && (
                            <p
                                role="status"
                                className="m-0 text-sm font-semibold text-ink-soft"
                            >
                                {t('print.reusing')}
                            </p>
                        )}

                        <ul className="m-0 flex list-none flex-col gap-4 p-0">
                            <PartRow
                                set="home"
                                part="calibration"
                                variant="trial"
                                row={rowFor('calibration', 'home')}
                                included={null}
                                guideHref={`${pageUrls.printGuide}#part-calibration`}
                                onToggle={() => undefined}
                                onMake={() => {
                                    request(set, ['calibration']);
                                }}
                                queued={isQueued('home', 'calibration')}
                                onUnqueue={() => {
                                    remove('home', 'calibration');
                                }}
                                disabled={uploadingFirst}
                                cards={cardCount}
                                edition={drawn}
                                photos={photos}
                            />
                        </ul>

                        <h2 className="m-0 mt-4 font-display text-2xl font-extrabold">
                            {t('print.group.game')}
                        </h2>
                        <ul className="m-0 flex list-none flex-col gap-4 p-0">
                            {GAME_PARTS.map((part, index) =>
                                rowOf(part, index),
                            )}
                        </ul>

                        <h2 className="m-0 mt-4 font-display text-2xl font-extrabold">
                            {t('print.group.extra')}
                        </h2>
                        <ul className="m-0 flex list-none flex-col gap-4 p-0">
                            {EXTRA_PARTS.map((part, index) =>
                                rowOf(part, index + GAME_PARTS.length),
                            )}
                        </ul>
                    </section>
                </div>

                {/* The main route stays in reach: make the set, then download it. */}
                <PrintBar
                    notice={
                        anyMade
                            ? job?.anonymous === true
                                ? t('print.close_note_anonymous', { days })
                                : t('print.close_note', { days })
                            : t('print.server_notice', { days })
                    }
                    problem={problem}
                    activity={activity}
                    estimate={estimate}
                    progress={t('print.progress', {
                        done: doneCount,
                        total: selected.length,
                    })}
                    copies={choice.copies}
                    onCopies={(copies) => {
                        choose(set, { copies });
                    }}
                    check={
                        checked === null
                            ? null
                            : { count: issues.length, href: `#${REVIEW_ID}` }
                    }
                >
                    <Button
                        variant={allDone ? 'secondary' : 'primary'}
                        // When all is done the download takes its place on a phone: one row of buttons.
                        className={allDone ? 'max-md:hidden' : 'max-md:flex-1'}
                        disabled={
                            uploadingFirst ||
                            throttle !== null ||
                            setLeft.length === 0 ||
                            allDone
                        }
                        onClick={() => {
                            request(set, setLeft);
                        }}
                    >
                        {setBusy && setLeft.length === 0 && !allDone
                            ? t('print.working')
                            : smallPhone
                              ? t('print.make_set_short')
                              : t(`print.make_set.${set}`)}
                    </Button>
                    {zipReady ? (
                        <Button
                            asChild
                            variant={allDone ? 'primary' : 'secondary'}
                            className="max-md:flex-1"
                        >
                            <a href={zipUrl} aria-label={t(`print.zip.${set}`)}>
                                {/* The long label ran over the edge of a phone (bug 8 of test round 4). */}
                                <span className="md:hidden">
                                    {t('print.zip_short')}
                                </span>
                                <span className="max-md:hidden">
                                    {t(`print.zip.${set}`)}
                                </span>
                            </a>
                        </Button>
                    ) : (
                        <Button
                            variant="secondary"
                            disabled
                            className={
                                // A phone, also on its side, shows the download only once it can be used: the bar
                                // stays one row and the estimate keeps its room (B179).
                                'max-md:hidden low:hidden'
                            }
                        >
                            {t(`print.zip.${set}`)}
                        </Button>
                    )}
                </PrintBar>
            </div>
        </>
    );
}

/** Megabytes with one decimal, with a comma in Dutch. */
function formatMegabytes(bytes: number, locale: string): string {
    const text = Math.max(0.1, bytes / 1048576).toFixed(1);

    return locale === 'nl' ? text.replace('.', ',') : text;
}

/** A size in whole mm, or with one decimal (a comma in Dutch). */
function formatMm(value: number, locale: string): string {
    const rounded = Math.round(value * 10) / 10;

    return locale === 'nl'
        ? String(rounded).replace('.', ',')
        : String(rounded);
}
