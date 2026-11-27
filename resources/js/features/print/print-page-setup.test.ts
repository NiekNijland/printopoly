import { makeEdition } from '@/testing/edition-test-utils';
import type { PrintJobData } from '@/types/generated';

import {
    NO_CHOICE,
    initialChoices,
    initialSet,
    printEditionOf,
    readAskedPart,
    rememberSet,
    setInUrl,
} from './print-page-setup';

describe('print-page-setup', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('opens the set in the address, else the one this browser chose, else the home set (B199)', () => {
        window.history.replaceState(null, '', '/nl/print?set=printer');
        expect(initialSet('e1')).toBe('printer');
        expect(setInUrl()).toBe(true);

        window.history.replaceState(null, '', '/nl/print');
        expect(setInUrl()).toBe(false);
        expect(initialSet('e1')).toBe('home');
        rememberSet('e1', 'printer');
        expect(initialSet('e1')).toBe('printer');
        expect(initialSet('e2')).toBe('home');
        expect(initialSet(null)).toBe('home');
    });

    it('reads the asked part once and takes it out of the address (R6 Kees)', () => {
        window.history.replaceState(null, '', '/nl/print?set=home&part=tokens');
        expect(readAskedPart()).toBe('tokens');
        expect(window.location.search).toBe('?set=home');
        expect(readAskedPart()).toBeNull();

        window.history.replaceState(null, '', '/nl/print?part=dice');
        expect(readAskedPart()).toBeNull();
    });

    it('takes the choices kept on the job, and none without a job', () => {
        expect(initialChoices(null)).toEqual({
            printer: NO_CHOICE,
            home: NO_CHOICE,
        });
        const kept: PrintJobData['choices']['home'] = {
            skipped: ['money'],
            moneyAmount: null,
            copies: 3,
            boardForm: 'whole',
            invitations: 12,
        };
        const job: PrintJobData = {
            token: 't',
            statusUrl: '/s',
            generateUrl: '/g',
            channel: { name: 'c', private: false },
            status: {
                busy: false,
                printerZipUrl: '',
                homeZipUrl: '',
                printerZipReady: false,
                homeZipReady: false,
                zipPreparing: false,
                parts: [],
            },
            anonymous: true,
            retentionDays: 7,
            choices: { printer: kept, home: { ...kept, copies: 1 } },
        };
        const choices = initialChoices(job);
        expect(choices.printer).toEqual(kept);
        expect(choices.home.copies).toBe(1);
    });

    it('counts the edition with the money, board form and invitations of the set', () => {
        const edition = makeEdition({ id: 'e1' });

        expect(
            printEditionOf(edition, 'full', {
                boardForm: 'whole',
                invitations: 8,
            }),
        ).toEqual({
            parts: edition.parts,
            boardProfile: edition.boardProfile,
            moneyAmount: 'full',
            boardForm: 'whole',
            invitations: 8,
            elements: edition.elements,
        });
        expect(printEditionOf(edition, 'four').boardForm).toBe('panels');
    });
});
