import { readStored, writeStored } from '@/lib/browser-storage';

import {
    addSent,
    forgetOwnerRecord,
    readFirstName,
    readOwnerRecord,
    readSent,
    writeFirstName,
    writeOwnerRecord,
    type SentRecord,
} from './local';

const sent = (receipt: string): SentRecord => ({
    receipt,
    elementKey: 'space.01',
    label: 'Kerkstraat',
    value: 'Molenweg',
    hasPhoto: false,
    sentAt: 1,
});

describe('owner records', () => {
    it('keeps the secret of each edition apart and forgets only one', () => {
        writeOwnerRecord('e1', { id: 'b1', secret: 'one' });
        writeOwnerRecord('e2', { id: 'b2', secret: 'two' });

        forgetOwnerRecord('e1');

        expect(readOwnerRecord('e1')).toBeNull();
        expect(readOwnerRecord('e2')).toEqual({ id: 'b2', secret: 'two' });
    });

    it('ignores a record without a secret and a store that is no object', () => {
        writeStored(
            'printopoly.boxes.owner',
            JSON.stringify({ e1: { id: 'b1' }, e2: 'b2' }),
        );
        expect(readOwnerRecord('e1')).toBeNull();
        expect(readOwnerRecord('e2')).toBeNull();

        writeStored('printopoly.boxes.owner', '[1,2]');
        expect(readOwnerRecord('0')).toBeNull();
    });

    it('starts again from an empty store when the stored text is broken', () => {
        writeStored('printopoly.boxes.owner', '{broken');

        writeOwnerRecord('e1', { id: 'b1', secret: 's' });

        expect(JSON.parse(readStored('printopoly.boxes.owner') ?? '')).toEqual({
            e1: { id: 'b1', secret: 's' },
        });
    });
});

describe('friend records', () => {
    it('has no first name until one is written', () => {
        expect(readFirstName()).toBe('');

        writeFirstName('Sanne');
        addSent('t1', sent('r1'));

        expect(readFirstName()).toBe('Sanne');
    });

    it('ignores a first name that is no text', () => {
        writeStored(
            'printopoly.boxes.friend',
            JSON.stringify({ firstName: 3 }),
        );

        expect(readFirstName()).toBe('');
    });

    it('keeps what was sent per link, newest first, and the first name with it', () => {
        writeFirstName('Sanne');
        addSent('t1', sent('r1'));
        addSent('t1', sent('r2'));
        addSent('t2', sent('r3'));

        expect(readSent('t1').map((item) => item.receipt)).toEqual([
            'r2',
            'r1',
        ]);
        expect(readSent('t2')).toEqual([sent('r3')]);
        expect(readFirstName()).toBe('Sanne');
    });

    it('keeps the newest fifty per link', () => {
        for (let index = 1; index <= 52; index++) {
            addSent('t1', sent(`r${String(index)}`));
        }

        const list = readSent('t1');

        expect(list).toHaveLength(50);
        expect(list[0]?.receipt).toBe('r52');
        expect(list[49]?.receipt).toBe('r3');
    });

    it('skips stored items without a receipt and lists that are no list', () => {
        writeStored(
            'printopoly.boxes.friend',
            JSON.stringify({
                sent: { t1: [sent('r1'), { label: 'x' }, 'r2'], t2: 'nope' },
            }),
        );

        expect(readSent('t1')).toEqual([sent('r1')]);
        expect(readSent('t2')).toEqual([]);
    });

    it('starts a new list when the stored lists are no object', () => {
        writeStored('printopoly.boxes.friend', JSON.stringify({ sent: 4 }));

        addSent('t1', sent('r1'));

        expect(readSent('t1')).toEqual([sent('r1')]);
    });
});
