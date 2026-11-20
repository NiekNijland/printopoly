import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

import { PartRow } from '@/components/print/part-row';
import { Button } from '@/components/ui/button';
import {
    SegmentedTabs,
    SegmentedTabsList,
    SegmentedTabsTrigger,
} from '@/components/ui/segmented-tabs';
import { usePrintJob } from '@/hooks/use-print-job';
import { useTranslation } from '@/hooks/use-translation';
import { PrintApiError, startRun, uploadPrintJob } from '@/lib/print/api';
import { loadLocalEdition } from '@/lib/print/local-edition';
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
}

const PRODUCTION_PARTS: PrintPart[] = [
    'board',
    'cards',
    'money',
    'tokens',
    'box_lid',
];

/**
 * The print page (B95, docs/design/Download.dc.html and Mobiel-download.dc.html). Nothing is made until the
 * user clicks "Drukkerij-set maken" or a single part; the explanation about the server sits directly above
 * that button. Status per part arrives live over Reverb.
 */
export default function PrintShow({
    job,
    edition,
    localEditionId,
}: PrintShowProps) {
    const t = useTranslation();
    const { locale, pageUrls } = usePage().props;
    const { status, setStatus } = usePrintJob(job);
    const [set, setSet] = useState<PrintSet>('printer');
    const [skipped, setSkipped] = useState<PrintPart[]>([]);
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const parts =
        job === null
            ? PRODUCTION_PARTS
            : PRODUCTION_PARTS.filter((part) => edition.parts.includes(part));
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
                const local = await loadLocalEdition(localEditionId);

                if (local === null) {
                    setError(t('print.no_edition'));

                    return;
                }

                // A job without an account: the browser sends the edition and its photos once (B80).
                const created = await uploadPrintJob(
                    local,
                    storePrintJob().url,
                );
                await startRun(
                    generate({ printJob: created.token }).url,
                    set,
                    chosen,
                );
                router.visit(created.url);

                return;
            }

            setStatus(await startRun(job.generateUrl, set, chosen));
        } catch (caught) {
            setError(
                caught instanceof PrintApiError && caught.status === 409
                    ? t('print.error_busy')
                    : t('print.error_generic'),
            );
        } finally {
            setWorking(false);
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
                        href={editionsIndex(locale)}
                        className="inline-flex min-h-12 items-center self-start font-semibold no-underline hover:text-press"
                    >
                        ‹{' '}
                        {edition.name === ''
                            ? t('print.back_to_editor')
                            : edition.name}
                    </Link>
                    <h1 className="m-0 font-display text-3xl leading-tight font-extrabold">
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

                        <ul className="m-0 list-none border-t-2 border-ink p-0">
                            <PartRow
                                set="home"
                                part="calibration"
                                row={rowFor('calibration', 'home')}
                                included={null}
                                onToggle={() => undefined}
                                onMake={() => void make(['calibration'])}
                                disabled={disabled}
                                cards={edition.cards}
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
                                    cards={edition.cards}
                                />
                            ))}
                        </ul>

                        <p className="m-0 text-sm text-ink-soft">
                            {t('print.skip_note')}
                        </p>

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
                                    {t(`print.make_set.${set}`)}
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
                            className="font-semibold"
                        >
                            {t('print.to_guide')}
                        </Link>
                    </aside>
                </div>
            </div>
        </>
    );
}
