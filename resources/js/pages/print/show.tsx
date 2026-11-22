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
import type { Edition } from '@/lib/edition/types';
import { resolveWords } from '@/lib/edition/words';
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
    loadLocalEdition,
    loadLocalEditionRecord,
    rememberPrintJob,
} from '@/lib/print/local-edition';
import { banknoteTotal, type MoneyAmount } from '@/lib/print/money';
import { photoTargets } from '@/lib/print/photo-targets';
import {
    cardCountOf,
    enabledPrintParts,
    toEdition,
} from '@/lib/print/print-edition';
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

const PRODUCTION_PARTS: PrintPart[] = [
    'board',
    'cards',
    'money',
    'tokens',
    'box_lid',
    'rules_booklet',
    'fold_models',
    'dice',
    'invitation',
];

/** The parts of the game itself and the extra printing, in the order they sit on the page (B149). */
const GAME_PARTS: PrintPart[] = [
    'board',
    'cards',
    'money',
    'tokens',
    'box_lid',
];
const EXTRA_PARTS: PrintPart[] = [
    'rules_booklet',
    'fold_models',
    'dice',
    'invitation',
];

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

/** The set this browser chose last, for any edition. */
const LAST_SET_KEY = `${SET_KEY}last`;

/**
 * The tab to open: the set in `?set=` (set after making a set), so you land on the set you made; otherwise the set
 * this browser used last for the edition (UX 3, ronde 3), and for an edition that never had one the set this
 * browser chose last at all (B185, UX 3 of test round 4): who prints at home keeps landing on the home set.
 */
export function initialSet(editionId: string | null): PrintSet {
    if (typeof window === 'undefined') {
        return 'printer';
    }
    const asked = new URLSearchParams(window.location.search).get('set');
    if (asked !== null) {
        return asked === 'home' ? 'home' : 'printer';
    }
    try {
        const own =
            editionId === null
                ? null
                : window.localStorage.getItem(SET_KEY + editionId);
        const kept = own ?? window.localStorage.getItem(LAST_SET_KEY);

        return kept === 'home' ? 'home' : 'printer';
    } catch {
        return 'printer';
    }
}

function rememberSet(editionId: string | null, set: PrintSet): void {
    try {
        window.localStorage.setItem(LAST_SET_KEY, set);

        if (editionId !== null) {
            window.localStorage.setItem(SET_KEY + editionId, set);
        }
    } catch {
        // Without storage the page opens on the print shop set, as before.
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
    const { issues, probe } = useChecks(checked ?? drawn, photos);

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
    const skipped = choice.skipped;
    const moneyAmount = choice.moneyAmount ?? moneyAmountOf(drawn, set);
    const counted = useMemo(
        () => printEditionOf(drawn, moneyAmount),
        [drawn, moneyAmount],
    );

    const parts =
        job === null
            ? enabledPrintParts(drawn)
            : PRODUCTION_PARTS.filter((part) => edition.parts.includes(part));
    const cardCount = job === null ? cardCountOf(drawn) : edition.cards;
    const selected = parts.filter((part) => !skipped.includes(part));
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
            parts.includes(row.part) &&
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
            skipped: choices[forSet].skipped,
            moneyAmount: choices[forSet].moneyAmount,
            copies: choices[forSet].copies,
        }),
        [choices],
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

    function toggle(part: PrintPart): void {
        choose(set, {
            skipped: skipped.includes(part)
                ? skipped.filter((p) => p !== part)
                : [...skipped, part],
        });
    }

    const name = edition.name === '' ? drawn.name : edition.name;
    const editorHref =
        localEditionId === null
            ? editionsIndex(locale)
            : editorShow({ locale, edition: localEditionId });
    const inGame = parts.filter((part) => GAME_PARTS.includes(part));
    const inExtra = parts.filter((part) => EXTRA_PARTS.includes(part));
    // Parts the edition leaves out are one line under their group, with the way to turn them on.
    const outOfGame = [
        ...GAME_PARTS.filter((part) => !parts.includes(part)).map((part) =>
            t(`print.part.${part}`).toLowerCase(),
        ),
        ...(parts.includes('cards') && !hasHouseRulesCard(drawn)
            ? [t('print.part.house_rules')]
            : []),
    ];
    const outOfExtra = EXTRA_PARTS.filter((part) => !parts.includes(part)).map(
        (part) => t(`print.part.${part}`).toLowerCase(),
    );
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

    const ownWords = resolveWords(drawn);
    const foldWords = {
        houses: ownWords.custom.house
            ? ownWords.house.plural
            : t('print.word.houses'),
        hotels: ownWords.custom.hotel
            ? ownWords.hotel.plural
            : t('print.word.hotels'),
    };

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
            case 'fold_models':
                // The pieces in the edition's own words (bug 26 of test round 4).
                return t(`print.spec.${set}.fold_models`, foldWords);
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

    const rowOf = (part: PrintPart, index: number) => (
        <PartRow
            key={part}
            set={set}
            part={part}
            row={rowFor(part, set)}
            included={part === 'board' ? null : !skipped.includes(part)}
            onToggle={() => {
                toggle(part);
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
                    value={moneyAmount}
                    disabled={isActive('money', set)}
                    onChange={(amount) => {
                        if (amount !== null) {
                            choose(set, { moneyAmount: amount });
                        }
                    }}
                />
            ) : undefined}
        </PartRow>
    );

    const notInEdition = (names: string[]) =>
        names.length === 0 ? null : (
            <p className="m-0 text-sm text-ink-soft">
                {t('print.not_in_edition', { parts: names.join(', ') })}{' '}
                <Link
                    href={editorHref}
                    className="font-semibold text-ink underline underline-offset-4 hover:text-press"
                >
                    {t('print.turn_on')}
                </Link>
            </p>
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
                    <div className="mx-auto flex max-w-content flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:gap-8 md:px-8 md:py-8">
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
                                    {t('print.meta', {
                                        parts: parts.length,
                                        cards: cardCount,
                                    })}
                                </p>
                            </div>
                        </div>
                        {/* Which set suits which shop, right above the choice (B185). */}
                        <div className="flex min-w-0 flex-col gap-2 md:max-w-sm md:flex-none md:self-end">
                            <p id="print-set-hint" className="sr-only">
                                {t('print.set_hint')}
                            </p>
                            {/* Each set names its shop right above its own tab. */}
                            <div
                                aria-hidden="true"
                                className="grid grid-cols-2 gap-2 text-center text-xs leading-tight font-semibold text-ink-soft"
                            >
                                <span>{t('print.set_for.printer')}</span>
                                <span>{t('print.set_for.home')}</span>
                            </div>
                            <SegmentedTabs
                                value={set}
                                onValueChange={(value) => {
                                    const next =
                                        value === 'home' ? 'home' : 'printer';
                                    setSet(next);
                                    rememberSet(localEditionId, next);
                                }}
                            >
                                <SegmentedTabsList
                                    aria-label={t('print.set_tabs')}
                                    aria-describedby="print-set-hint"
                                >
                                    <SegmentedTabsTrigger value="printer">
                                        {t('print.set.printer')}
                                    </SegmentedTabsTrigger>
                                    <SegmentedTabsTrigger value="home">
                                        {t('print.set.home')}
                                    </SegmentedTabsTrigger>
                                </SegmentedTabsList>
                            </SegmentedTabs>
                        </div>
                    </div>
                </header>

                <div className="mx-auto flex w-full max-w-content flex-wrap items-start gap-x-12 gap-y-8 px-4 pt-8 pb-12 md:px-8 md:pt-10 md:pb-16">
                    <section
                        aria-label={t('print.title')}
                        className="flex min-w-0 flex-[999_1_32rem] flex-col gap-4"
                    >
                        <p className="m-0 max-w-prose">
                            {t(`print.intro.${set}`)}
                        </p>

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
                            {inGame.map((part, index) => rowOf(part, index))}
                        </ul>
                        {notInEdition(outOfGame)}

                        {(inExtra.length > 0 || outOfExtra.length > 0) && (
                            <>
                                <h2 className="m-0 mt-4 font-display text-2xl font-extrabold">
                                    {t('print.group.extra')}
                                </h2>
                                {inExtra.length > 0 && (
                                    <ul className="m-0 flex list-none flex-col gap-4 p-0">
                                        {inExtra.map((part, index) =>
                                            rowOf(part, index),
                                        )}
                                    </ul>
                                )}
                                {notInEdition(outOfExtra)}
                            </>
                        )}

                        {selected.length === 0 && (
                            <p className="m-0 text-sm text-ink-soft">
                                {t('print.nothing_selected')}
                            </p>
                        )}
                    </section>

                    <aside className="flex min-w-0 flex-[1_1_16rem] flex-col gap-2 border-2 border-ink bg-card p-4 shadow-print md:mt-12 md:max-w-xs">
                        <strong className="font-display text-xl font-extrabold">
                            {t('print.aside_title')}
                        </strong>
                        <p className="m-0 text-ink-soft">
                            {t('print.combine_note')}
                        </p>
                        <Link
                            href={pageUrls.printGuide}
                            className="inline-flex min-h-11 items-center self-start font-semibold"
                        >
                            {t('print.to_guide')}
                        </Link>
                    </aside>
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
                            : {
                                  count: issues.length,
                                  href: editorShow(
                                      { locale, edition: checked.id },
                                      { query: { check: '1' } },
                                  ).url,
                              }
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
