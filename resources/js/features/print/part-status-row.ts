import type {
    PrintPart,
    PrintPartStatusData,
    PrintSet,
} from '@/types/generated';

/** The parts of the request on its way to the server, so they cannot be asked for twice. */
export type Sending = { set: PrintSet; parts: PrintPart[] } | null;

export const partStatusRow = (
    rows: PrintPartStatusData[],
    sending: Sending,
    part: PrintPart,
    forSet: PrintSet,
): PrintPartStatusData | undefined => {
    const found = rows.find(
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
