import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { PartRow } from '@/components/print/part-row';
import { Button } from '@/components/ui/button';
import {
    SegmentedTabs,
    SegmentedTabsList,
    SegmentedTabsTrigger,
} from '@/components/ui/segmented-tabs';
import { sampleEdition } from '@/data/sample-edition';
import { usePrintJob } from '@/hooks/use-print-job';
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
} from '@/lib/print/local-edition';
import { photoTargets } from '@/lib/print/photo-targets';
import {
    cardCountOf,
    enabledPrintParts,
    toEdition,
} from '@/lib/print/print-edition';
import { show as editorShow } from '@/routes/editor';
import { index as editionsIndex } from '@/routes/editions';
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
    ): PrintPartStatusData | undefined =>
        status.parts.find(
            (row) =>
                row.part === part &&
                row.set === (part === 'calibration' ? 'home' : forSet),
        );
    const anyMade = parts.some(
        (part) => (rowFor(part, set)?.status ?? 'idle') !== 'idle',
    );
    const disabled = working || status.busy;
    const zipReady =
        set === 'printer' ? status.printerZipReady : status.homeZipReady;
    const zipUrl = set === 'printer' ? status.printerZipUrl : status.homeZipUrl;
    const days = job?.retentionDays ?? 7;

    async function make(chosen: PrintPart[]): Promise<void> {
        setWorking(true);
        setError(null);

        try {
            if (job === null) {
                const local = await loadLocalEdition(localEditionId, locale);

                if (local === null) {
                    setError(t('print.no_edition'));

                    return;
                }

                // A job without an account: the browser sends the edition and its photos once (B80).
                const created = await uploadPrintJob(
                    local,
                    storePrintJob().url,
                    (done, total) => setUploading({ done, total }),
                );
                setUploading(null);
                await startRun(
                    generate({ printJob: created.token }).url,
                    set,
                    chosen,
                );
                router.visit(`${created.url}?set=${set}`);

                return;
            }

            // The frame of every photo comes from the renderers, so the browser says how large it is (B61).
            const targets =
                editionData === null
                    ? undefined
                    : photoTargets(toEdition(editionData));

            setStatus(await startRun(job.generateUrl, set, chosen, targets));
        } catch (caught) {
            const status = caught instanceof PrintApiError ? caught.status : 0;

            setError(
                status === 409
                    ? t('print.error_busy')
                    : status === 429
                      ? t('print.error_throttled')
                      : status === 422
                        ? t('print.error_photos')
                        : t('print.error_generic'),
            );
        } finally {
            setWorking(false);
            setUploading(null);
        }
    }

    function toggle(part: PrintPart): void {
        setSkipped((current) =>
            current.includes(part)
                ? current.filter((p) => p !== part)
                : [...current, part],
        );
    }

    return (
        <>
            <Head title={t('print.title')} />
            <div className="mx-auto flex max-w-content flex-col gap-6 px-4 py-8 md:gap-8 md:px-8 md:py-12">
                <div className="flex flex-col gap-2">
                    <Link
                        href={
                            localEditionId === null
                                ? editionsIndex(locale)
                                : editorShow({
                                      locale,
                                      edition: localEditionId,
                                  })
                        }
                        className="inline-flex min-h-12 items-center self-start font-semibold no-underline hover:text-press"
                    >
                        ‹{' '}
                        {edition.name === ''
                            ? t('print.back_to_editor')
                            : edition.name}
                    </Link>
                    <div className="flex items-end gap-4" aria-hidden="true">
                        {/* A print shop's colour bar: the four inks, as on the edge of a proof. */}
                        <span className="flex h-3 w-24 border-2 border-ink">
                            <span className="flex-1 bg-print-cyan" />
                            <span className="flex-1 bg-print-magenta" />
                            <span className="flex-1 bg-print-riso-yellow" />
                            <span className="flex-1 bg-ink" />
                        </span>
                    </div>
                    <h1 className="m-0 font-display text-hero leading-none font-extrabold">
                        {t('print.title')}
                    </h1>
                </div>

                <SegmentedTabs
                    value={set}
                    onValueChange={(value) =>
                        setSet(value === 'home' ? 'home' : 'printer')
                    }
                    className="md:max-w-md"
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

                <div className="flex flex-wrap items-start gap-x-12 gap-y-8">
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
                                row={rowFor('calibration', 'home')}
                                included={null}
                                onToggle={() => undefined}
                                onMake={() => void make(['calibration'])}
                                disabled={disabled}
                                cards={cardCount}
                                edition={drawn}
                                photos={photos}
                            />
                            {parts.map((part) => (
                                <PartRow
                                    key={part}
                                    set={set}
                                    part={part}
                                    row={rowFor(part, set)}
                                    included={
                                        part === 'board'
                                            ? null
                                            : !skipped.includes(part)
                                    }
                                    onToggle={() => {
                                        toggle(part);
                                    }}
                                    onMake={() => void make([part])}
                                    disabled={disabled}
                                    cards={cardCount}
                                    edition={drawn}
                                    photos={photos}
                                />
                            ))}
                        </ul>

                        <p className="m-0 text-sm text-ink-soft">
                            {t('print.skip_note')}
                        </p>

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

                        {!anyMade ? (
                            <div className="flex flex-col gap-3 pt-2">
                                <p className="m-0 max-w-prose text-sm text-ink-soft">
                                    {t('print.server_notice', { days })}
                                </p>
                                <Button
                                    className="w-full self-start md:w-auto"
                                    disabled={disabled || selected.length === 0}
                                    onClick={() => void make(selected)}
                                >
                                    {working
                                        ? t('print.working')
                                        : t(`print.make_set.${set}`)}
                                </Button>
                                {selected.length === 0 && (
                                    <p className="m-0 text-sm text-ink-soft">
                                        {t('print.nothing_selected')}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
                                {zipReady ? (
                                    <Button asChild>
                                        <a href={zipUrl}>
                                            {t(`print.zip.${set}`)}
                                        </a>
                                    </Button>
                                ) : (
                                    <Button variant="secondary" disabled>
                                        {t(`print.zip.${set}`)}
                                    </Button>
                                )}
                                <p className="m-0 text-sm text-ink-soft">
                                    {job?.anonymous === true
                                        ? t('print.close_note_anonymous', {
                                              days,
                                          })
                                        : t('print.close_note', { days })}
                                </p>
                            </div>
                        )}
                    </section>

                    <aside className="flex min-w-0 flex-[1_1_18rem] flex-col gap-4">
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
            </div>
        </>
    );
}
