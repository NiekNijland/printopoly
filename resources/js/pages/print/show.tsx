import { Head, usePage } from '@inertiajs/react';
import { useMemo } from 'react';

import { useChecks } from '@/features/edition/editor/check-probe';
import { getServices } from '@/features/edition/editor/services';
import {
    carryPrintJob,
    loadLocalEdition,
    loadLocalEditionRecord,
    rememberPrintJob,
} from '@/features/edition/local-edition';
import { usedPhotoIds } from '@/features/edition/repository';
import { PrintHeader } from '@/features/print/print-header';
import { PrintPageBar } from '@/features/print/print-page-bar';
import {
    EXTRA_PARTS,
    GAME_PARTS,
    type PrintServices,
} from '@/features/print/print-page-setup';
import { PrintPartsSection } from '@/features/print/print-parts-section';
import { ReviewList } from '@/features/print/review-list';
import {
    CalibrationRow,
    SetPartRow,
    usePageText,
} from '@/features/print/set-part-row';
import { useAskedPart } from '@/features/print/use-asked-part';
import {
    usePrintPage,
    type PrintPageProps,
} from '@/features/print/use-print-page';
import type { Edition, PrintSelection } from '@/lib/render/edition-types';
import {
    SET_PARTS,
    defaultPrintSelection,
    selectionFromSkipped,
    selectionOfRows,
    type SetPart,
} from '@/lib/render/print-selection';
import { index as editionsIndex } from '@/routes/editions';
import { show as editorShow } from '@/routes/editor';
import type { Locale } from '@/types/game';
import type {
    PrintJobData,
    PrintJobStatusData,
    PrintPart,
    PrintSet,
} from '@/types/generated';

/**
 * What goes in the set (B198): the choice made here, else the one the edition keeps, else what the job skipped
 * (a job page in a browser without the edition), else the parts the edition had switched on.
 */
const selectionOf = (
    chosen: PrintSelection | null,
    checked: Edition | null,
    job: PrintJobData | null,
    drawn: Edition,
    set: PrintSet,
    serverParts: PrintPart[],
): PrintSelection => {
    if (chosen !== null) {
        return chosen;
    }
    if (checked?.printSelection !== undefined) {
        return checked.printSelection;
    }
    const kept = job?.choices[set];
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
};

const PARTS: SetPart[] = [...GAME_PARTS, ...EXTRA_PARTS];

const anyMadeIn = (status: PrintJobStatusData, set: PrintSet): boolean =>
    status.parts.some(
        (row) =>
            (PARTS as readonly PrintPart[]).includes(row.part) &&
            row.set === set &&
            row.status !== 'idle',
    );

const servicesOf = (
    localEditionId: string | null,
    locale: Locale,
): PrintServices => ({
    loadEdition: () => loadLocalEditionRecord(localEditionId, locale),
    loadUpload: () => loadLocalEdition(localEditionId, locale),
    storage: () => getServices(locale).storage,
    rememberJob: (edition, token) =>
        rememberPrintJob(edition, token, getServices(locale).storage),
    carryJob: (token, editionId, fromRevision, toRevision) =>
        carryPrintJob(
            getServices(locale).storage,
            token,
            editionId,
            fromRevision,
            toRevision,
        ),
    keepSelection: (id, selection) =>
        getServices(locale).repository.setPrintSelection(id, selection),
    photoIds: usedPhotoIds,
});

/**
 * The print page (B95, docs/design/Download.dc.html and Mobiel-download.dc.html). Nothing is made until the
 * user clicks "Drukkerij-set maken" or a single part; the explanation about the server sits directly above
 * that button. Status per part arrives live over Reverb.
 */
const PrintShow = (props: PrintPageProps) => {
    const { localEditionId } = props;
    const { locale } = usePage().props;
    const services = useMemo(
        () => servicesOf(localEditionId, locale),
        [localEditionId, locale],
    );
    const page = usePrintPage(props, services, selectionOf);
    const { issues, probe } = useChecks(page.inSet, page.photos);
    const askedPart = useAskedPart(page.ready);
    const { t, guide } = usePageText();
    const { set, job, checked } = page;

    return (
        <>
            <Head title={t('print.title')} />
            {checked !== null && probe}
            <div className="flex flex-col">
                <PrintHeader
                    edition={page.drawn}
                    photos={page.photos}
                    editorHref={
                        localEditionId === null
                            ? editionsIndex(locale)
                            : editorShow({ locale, edition: localEditionId })
                    }
                    name={
                        page.edition.name === ''
                            ? page.drawn.name
                            : page.edition.name
                    }
                    parts={page.selected.length}
                    cards={page.cardCount}
                    set={set}
                    onSet={page.switchSet}
                />

                <div className="mx-auto flex w-full max-w-content flex-col gap-4 px-4 pt-8 pb-12 md:px-8 md:pt-10 md:pb-16">
                    {/* The step before printing (B197): what the Controle still has open, each with a way to it. */}
                    {checked !== null && (
                        <ReviewList
                            issues={issues}
                            edition={checked}
                            locale={locale === 'en' ? 'en' : 'nl'}
                        />
                    )}
                    <PrintPartsSection
                        set={set}
                        guideHref={guide}
                        rememberFailed={page.rememberFailed}
                        reusing={
                            job === null && page.reusing && page.local !== null
                        }
                        calibration={<CalibrationRow page={page} />}
                        rowOf={(part, index) => (
                            <SetPartRow
                                key={part}
                                page={page}
                                askedPart={askedPart}
                                part={part}
                                index={index}
                            />
                        )}
                    />
                </div>

                <PrintPageBar
                    page={page}
                    anyMade={anyMadeIn(page.status, set)}
                    issues={checked === null ? null : issues}
                />
            </div>
        </>
    );
};
export default PrintShow;
