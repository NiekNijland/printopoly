import {
    array,
    boolean,
    keyOf,
    nullable,
    number,
    oneOf,
    record,
    string,
    type Parser,
} from '@/lib/parse';
import type {
    PartStatus,
    PrintJobReadyData,
    PrintJobStatusData,
    PrintPart,
    PrintPartStatusData,
} from '@/types/generated';

const PRINT_PARTS: Readonly<Record<PrintPart, true>> = {
    board: true,
    cards: true,
    money: true,
    tokens: true,
    box_lid: true,
    rules_booklet: true,
    invitation: true,
    calibration: true,
};

const PART_STATUSES: Readonly<Record<PartStatus, true>> = {
    idle: true,
    waiting: true,
    running: true,
    done: true,
    failed: true,
    outdated: true,
};

const printPart = keyOf(PRINT_PARTS);

const partStatusData: Parser<PrintPartStatusData> = record({
    set: oneOf(['printer', 'home']),
    part: printPart,
    status: keyOf(PART_STATUSES),
    waitingFor: nullable(printPart),
    pages: nullable(number),
    bytes: nullable(number),
    downloadUrl: nullable(string),
    instructionsUrl: nullable(string),
    reason: nullable(string),
    imageUrl: nullable(string),
});

/** The status of a print job as the server sends it. */
export const jobStatus: Parser<PrintJobStatusData> = record({
    busy: boolean,
    printerZipUrl: string,
    homeZipUrl: string,
    printerZipReady: boolean,
    homeZipReady: boolean,
    zipPreparing: boolean,
    parts: array(partStatusData),
});

/** The secret links of a new job. */
export const uploadResult = record({
    token: string,
    url: string,
    statusUrl: string,
});

const jobReady: Parser<PrintJobReadyData> = record({
    token: string,
    printerReadyUntil: nullable(number),
    printerOutdated: boolean,
    homeReadyUntil: nullable(number),
    homeOutdated: boolean,
});

/** What is ready per job. */
export const jobsReady = record({ jobs: array(jobReady) });
