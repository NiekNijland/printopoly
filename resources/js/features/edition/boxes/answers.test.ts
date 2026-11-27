import {
    readAccountBox,
    readCreatedBox,
    readFailureMessage,
    readJobId,
    readJobState,
    readOwnerBox,
    readReceipt,
} from './answers';
import type { BoxContributionData, OwnerBox } from './types';

const contribution: BoxContributionData = {
    id: 'c1',
    elementKey: 'space.02',
    firstName: 'Sanne',
    field: 'name',
    value: 'Kerkstraat',
    amount: null,
    open: ['name', 'photo'],
    hasPhoto: true,
    width: 800,
    height: 600,
    photoUrl: '/api/boxes/b1/contributions/c1/photo',
    createdAt: 1,
};

const box: OwnerBox = {
    id: 'b1',
    editionId: 'edition-1',
    url: 'https://example.test/box/tok',
    status: 'open',
    expiresAt: 10,
    accepted: 1,
    rejected: 2,
    cardsHidden: false,
    channel: 'box.abc',
    contributions: [contribution],
};

describe('readOwnerBox', () => {
    it('reads the box as its owner sees it, with its contributions', () => {
        expect(readOwnerBox(box)).toEqual(box);
    });

    it('keeps only the parts it knows of a contribution', () => {
        expect(
            readOwnerBox({
                ...box,
                contributions: [{ ...contribution, open: ['name', 'size'] }],
            }).contributions[0]?.open,
        ).toEqual(['name']);
    });

    it('refuses what is no box or holds no contribution', () => {
        expect(() => readOwnerBox(null)).toThrow('not a box');
        expect(() => readOwnerBox({ ...box, status: 'gone' })).toThrow(
            'not a box',
        );
        expect(() =>
            readOwnerBox({
                ...box,
                contributions: [{ ...contribution, field: 'photo' }],
            }),
        ).toThrow('not a contribution');
    });
});

describe('the other answers', () => {
    it('reads the owner secret of a new box only when there is one', () => {
        expect(readCreatedBox({ ...box, ownerSecret: 's' })).toEqual({
            ...box,
            ownerSecret: 's',
        });
        expect(readCreatedBox(box)).toEqual(box);
    });

    it('reads the box of an account, or none', () => {
        expect(readAccountBox({ box })).toEqual(box);
        expect(readAccountBox({ box: null })).toBeNull();
        expect(() => readAccountBox({})).toThrow('not a box or none');
    });

    it('reads a receipt, a job and the state of a job', () => {
        expect(readReceipt({ id: 'c', receipt: 'r' })).toEqual({
            id: 'c',
            receipt: 'r',
        });
        expect(() => readReceipt({ id: 'c' })).toThrow('not a receipt');
        expect(readJobId({ id: 'j' })).toEqual({ id: 'j' });
        expect(() => readJobId([])).toThrow('not a job');
        expect(readJobState({ status: 'failed', message: 'kapot' })).toEqual({
            status: 'failed',
            message: 'kapot',
        });
        expect(readJobState({ status: 'busy', message: 3 })).toEqual({
            status: 'busy',
        });
        expect(() => readJobState({})).toThrow('not the state of a job');
    });

    it('takes the first validation message, else the message, else the status text', () => {
        expect(
            readFailureMessage(
                { errors: { value: ['Links kunnen hier niet.', 'Tweede'] } },
                'Unprocessable',
            ),
        ).toBe('Links kunnen hier niet.');
        expect(
            readFailureMessage({ message: 'Te veel' }, 'Too Many Requests'),
        ).toBe('Te veel');
        expect(readFailureMessage('html', 'Server Error')).toBe('Server Error');
    });
});
