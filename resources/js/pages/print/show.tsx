import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
} from 'react';

import { PartRow } from '@/components/print/part-row';
import { PartThumb } from '@/components/print/part-thumb';
import { Button } from '@/components/ui/button';
import {
    SegmentedTabs,
    SegmentedTabsList,
    SegmentedTabsTrigger,
} from '@/components/ui/segmented-tabs';
import { sampleEdition } from '@/data/sample-edition';
import { usePrintJob } from '@/hooks/use-print-job';
import { usePrintQueue } from '@/hooks/use-print-queue';
import type { StartOutcome } from '@/hooks/use-print-queue';
import { useTranslation } from '@/hooks/use-translation';
import { usedPhotoIds } from '@/lib/edition/repository';
import type { Edition } from '@/lib/edition/types';
import { PhotoCache } from '@/lib/editor/photo-cache';
import { getServices } from '@/lib/editor/services';
import { PrintApiError, startRun, uploadPrintJob } from '@/lib/print/api';
import type { PrintEdition } from '@/lib/print/composition';
import {
    loadLocalEdition,
    loadLocalEditionRecord,
    rememberPrintJob,
} from '@/lib/print/local-edition';
import { photoTargets } from '@/lib/print/photo-targets';
import {
    cardCountOf,
    enabledPrintParts,
    toEdition,
} from '@/lib/print/print-edition';
import { index as editionsIndex } from '@/routes/editions';
import { show as editorShow } from '@/routes/editor';
import { generate } from '@/routes/print';
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

/** The tab to open: the set in `?set=` (set after making a set), so you land on the set you made. */
function initialSet(): PrintSet {
    if (typeof window === 'undefined') {
        return 'printer';
    }

    return new URLSearchParams(window.location.search).get('set') === 'home'
        ? 'home'
        : 'printer';
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
    const { locale, pageUrls } = usePage().props;
    const { status, setStatus } = usePrintJob(job);
    const [set, setSet] = useState<PrintSet>(initialSet);
    const [skipped, setSkipped] = useState<PrintPart[]>([]);
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    /** The parts of the request on its way to the server, so they cannot be asked for twice. */
    const [sending, setSending] = useState<{
        set: PrintSet;
        parts: PrintPart[];
    } | null>(null);
    /** Photos sent so far while the edition is uploaded for a new job; null when nothing is uploading. */
    const [uploading, setUploading] = useState<{
        done: number;
        total: number;
    } | null>(null);
    const [local, setLocal] = useState<Edition | null>(null);

    // Before a job exists the edition is in this browser (B80): draw the parts from it.
    useEffect(() => {
        if (job !== null) {
            return;
        }

        let cancelled = false;

        loadLocalEditionRecord(localEditionId, locale)
            .then((found) => {
                if (!cancelled && found !== undefined) {
                    setLocal(found);
                }
            })
            .catch(() => undefined);

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

    useEffect(() => {
        cache.request(usedPhotoIds(drawn.elements));
    }, [cache, drawn]);

    useEffect(() => {
        return () => {
            cache.dispose();
        };
    }, [cache]);

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
    const uploadingFirst = job === null && working;
    const zipReady =
        set === 'printer' ? status.printerZipReady : status.homeZipReady;
    const zipUrl = set === 'printer' ? status.printerZipUrl : status.homeZipUrl;
    const days = job?.retentionDays ?? 7;

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

                    // A job without an account: the browser sends the edition and its photos once (B80).
                    const created = await uploadPrintJob(
                        local,
                        storePrintJob().url,
                        (done, total) => setUploading({ done, total }),
                    );
                    setUploading(null);
                    await rememberPrintJob(
                        local.edition,
                        created.token,
                        getServices(locale).storage,
                    );
                    await startRun(
                        generate({ printJob: created.token }).url,
                        forSet,
                        chosen,
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
                    await startRun(job.generateUrl, forSet, chosen, targets),
                );

                return 'started';
            } catch (caught) {
                const status =
                    caught instanceof PrintApiError ? caught.status : 0;

                // A run is still going on the server: the parts stay in line and start after it.
                if (status === 409 && job !== null) {
                    return 'busy';
                }

                setError(
                    status === 409
                        ? t('print.error_busy')
                        : status === 429
                          ? t('print.error_throttled')
                          : status === 422
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
        [editionData, job, locale, localEditionId, setStatus, t],
    );

    // A part asked for while a run is going waits in this browser and starts right after it.
    const { queue, isQueued, enqueue, remove } = usePrintQueue(
        job !== null && !working && !status.busy,
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

    function toggle(part: PrintPart): void {
        setSkipped((current) =>
            current.includes(part)
                ? current.filter((p) => p !== part)
                : [...current, part],
        );
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
        ...(parts.includes('cards') && !drawn.parts.houseRules
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
        working || status.busy || queue.some((entry) => entry.set === set);

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
            {...(part === 'cards' && drawn.parts.houseRules
                ? { note: t('print.house_rules_line') }
                : {})}
        />
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

    return (
        <>
            <Head title={t('print.title')} />
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
                        <SegmentedTabs
                            value={set}
                            onValueChange={(value) =>
                                setSet(value === 'home' ? 'home' : 'printer')
                            }
                            className="md:max-w-sm md:flex-none md:self-end"
                        >
                            <SegmentedTabsList aria-label={t('print.set_tabs')}>
                                <SegmentedTabsTrigger value="printer">
                                    {t('print.set.printer')}
                                </SegmentedTabsTrigger>
                                <SegmentedTabsTrigger value="home">
                                    {t('print.set.home')}
                                </SegmentedTabsTrigger>
                            </SegmentedTabsList>
                        </SegmentedTabs>
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

                        {working && (
                            <p
                                role="status"
                                className="m-0 rounded-control border-2 border-ink bg-card px-3 py-2 text-sm font-semibold"
                            >
                                {uploading === null
                                    ? t('print.starting')
                                    : t('print.uploading', {
                                          done: uploading.done,
                                          total: uploading.total,
                                      })}
                            </p>
                        )}

                        {error !== null && (
                            <p
                                role="alert"
                                className="m-0 rounded-control border-2 border-ink bg-warning px-3 py-2 text-sm"
                            >
                                {error}
                            </p>
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
                <div className="sticky bottom-0 z-20 border-t-2 border-ink bg-card">
                    <div className="mx-auto flex max-w-content flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-6 md:px-8">
                        <p className="m-0 flex-1 text-xs text-ink-soft md:text-sm">
                            {anyMade
                                ? job?.anonymous === true
                                    ? t('print.close_note_anonymous', { days })
                                    : t('print.close_note', { days })
                                : t('print.server_notice', { days })}
                        </p>
                        <span
                            aria-live="polite"
                            className="hidden font-mono text-xs text-ink-soft md:inline"
                        >
                            {t('print.progress', {
                                done: doneCount,
                                total: selected.length,
                            })}
                        </span>
                        <div className="flex flex-col gap-2 md:flex-row md:gap-3">
                            <Button
                                variant={allDone ? 'secondary' : 'primary'}
                                disabled={
                                    uploadingFirst ||
                                    setLeft.length === 0 ||
                                    allDone
                                }
                                onClick={() => {
                                    request(set, setLeft);
                                }}
                            >
                                {setBusy && setLeft.length === 0 && !allDone
                                    ? t('print.working')
                                    : t(`print.make_set.${set}`)}
                            </Button>
                            {zipReady ? (
                                <Button
                                    asChild
                                    variant={allDone ? 'primary' : 'secondary'}
                                >
                                    <a href={zipUrl}>{t(`print.zip.${set}`)}</a>
                                </Button>
                            ) : (
                                <Button
                                    variant="secondary"
                                    disabled
                                    className={anyMade ? '' : 'max-md:hidden'}
                                >
                                    {t(`print.zip.${set}`)}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
