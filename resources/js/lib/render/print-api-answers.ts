import type {
    PartStatus,
    PrintJobReadyData,
    PrintJobStatusData,
    PrintPart,
    PrintPartStatusData,
} from '@/types/generated';
import { isObject } from './edition-schema-values';

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

const isPrintPart = (value: unknown): value is PrintPart =>
    typeof value === 'string' && Object.hasOwn(PRINT_PARTS, value);

const isPartStatus = (value: unknown): value is PartStatus =>
    typeof value === 'string' && Object.hasOwn(PART_STATUSES, value);

const isNumberOrNull = (value: unknown): value is number | null =>
    value === null || typeof value === 'number';

const isStringOrNull = (value: unknown): value is string | null =>
    value === null || typeof value === 'string';

const isPartStatusData = (value: unknown): value is PrintPartStatusData =>
    isObject(value) &&
    (value.set === 'printer' || value.set === 'home') &&
    isPrintPart(value.part) &&
    isPartStatus(value.status) &&
    (value.waitingFor === null || isPrintPart(value.waitingFor)) &&
    isNumberOrNull(value.pages) &&
    isNumberOrNull(value.bytes) &&
    isStringOrNull(value.downloadUrl) &&
    isStringOrNull(value.instructionsUrl) &&
    isStringOrNull(value.reason) &&
    isStringOrNull(value.imageUrl);

/** Whether an answer is the status of a print job as the server sends it. */
export const isJobStatus = (body: unknown): body is PrintJobStatusData =>
    isObject(body) &&
    typeof body.busy === 'boolean' &&
    typeof body.printerZipUrl === 'string' &&
    typeof body.homeZipUrl === 'string' &&
    typeof body.printerZipReady === 'boolean' &&
    typeof body.homeZipReady === 'boolean' &&
    typeof body.zipPreparing === 'boolean' &&
    Array.isArray(body.parts) &&
    body.parts.every(isPartStatusData);

/** Whether an answer holds the secret links of a new job. */
export const isUploadResult = (
    body: unknown,
): body is { token: string; url: string; statusUrl: string } =>
    isObject(body) &&
    typeof body.token === 'string' &&
    typeof body.url === 'string' &&
    typeof body.statusUrl === 'string';

const isJobReady = (value: unknown): value is PrintJobReadyData =>
    isObject(value) &&
    typeof value.token === 'string' &&
    isNumberOrNull(value.printerReadyUntil) &&
    typeof value.printerOutdated === 'boolean' &&
    isNumberOrNull(value.homeReadyUntil) &&
    typeof value.homeOutdated === 'boolean';

/** Whether an answer lists what is ready per job. */
export const isJobsReady = (
    body: unknown,
): body is { jobs: PrintJobReadyData[] } =>
    isObject(body) && Array.isArray(body.jobs) && body.jobs.every(isJobReady);
