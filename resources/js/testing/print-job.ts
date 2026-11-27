import type {
    PartStatus,
    PrintJobData,
    PrintPart,
    PrintPartStatusData,
    PrintSet,
} from '@/types/generated';

export const partRow = (
    set: PrintSet,
    part: PrintPart,
    status: PartStatus,
    extra: Partial<PrintPartStatusData> = {},
): PrintPartStatusData => ({
    set,
    part,
    status,
    waitingFor: null,
    pages: null,
    bytes: null,
    downloadUrl: null,
    instructionsUrl: null,
    reason: null,
    imageUrl: null,
    ...extra,
});

export const printJob = (
    parts: PrintPartStatusData[],
    overrides: Partial<PrintJobData['status']> = {},
): PrintJobData => ({
    token: 't',
    statusUrl: '/api/print/t/status',
    generateUrl: '/api/print/t/generate',
    channel: { name: 'print-anon.t', private: false },
    status: {
        busy: false,
        printerZipUrl: '/zip/printer',
        homeZipUrl: '/zip/home',
        printerZipReady: false,
        homeZipReady: false,
        zipPreparing: false,
        parts,
        ...overrides,
    },
    anonymous: true,
    retentionDays: 7,
    choices: {
        printer: {
            skipped: [],
            moneyAmount: null,
            copies: 1,
            boardForm: 'panels',
            invitations: 4,
        },
        home: {
            skipped: [],
            moneyAmount: null,
            copies: 1,
            boardForm: 'panels',
            invitations: 4,
        },
    },
});

export const printPageEdition: {
    name: string;
    cards: number;
    parts: PrintPart[];
} = {
    name: 'Zaterdagclub',
    cards: 60,
    parts: ['board', 'cards', 'money', 'tokens', 'box_lid'],
};
