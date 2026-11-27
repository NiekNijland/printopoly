import { partRow } from '@/testing/print-job';

import { partStatusRow, type Sending } from './part-status-row';

describe('partStatusRow', () => {
    const rows = [
        partRow('printer', 'board', 'done'),
        partRow('home', 'board', 'failed'),
        partRow('home', 'calibration', 'done'),
    ];

    it('takes the row of the part in the set', () => {
        expect(partStatusRow(rows, null, 'board', 'printer')?.status).toBe(
            'done',
        );
        expect(partStatusRow(rows, null, 'board', 'home')?.status).toBe(
            'failed',
        );
        expect(partStatusRow(rows, null, 'cards', 'home')).toBeUndefined();
    });

    it('takes the one test sheet of home in either set', () => {
        expect(
            partStatusRow(rows, null, 'calibration', 'printer')?.status,
        ).toBe('done');
    });

    it('shows a part on its way to the server as waiting, in its own set only', () => {
        const sending: Sending = { set: 'printer', parts: ['board'] };

        expect(partStatusRow(rows, sending, 'board', 'printer')).toMatchObject({
            set: 'printer',
            status: 'waiting',
            waitingFor: null,
        });
        expect(partStatusRow(rows, sending, 'board', 'home')?.status).toBe(
            'failed',
        );
        expect(
            partStatusRow(
                rows,
                { set: 'printer', parts: ['calibration'] },
                'calibration',
                'home',
            ),
        ).toMatchObject({ set: 'home', status: 'waiting' });
    });
});
