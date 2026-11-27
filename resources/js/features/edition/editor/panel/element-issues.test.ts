import type { CheckIssue } from '@/lib/render/checks-types';
import { spaceOfKey } from '@/lib/render/editor-panel-sections';
import { sampleEdition } from '@/testing/editions';

import { elementIssues, friendsFor } from './element-issues';
import type { FriendsProps } from './friends-section';

const issue = (
    elementKey: string,
    field: string,
    alsoKeys?: string[],
): CheckIssue => ({
    id: `${elementKey}|${field}`,
    code: 'photo.low-resolution',
    elementKey,
    field,
    severity: 'warning',
    icon: 'triangle-alert',
    severityLabel: { nl: 'Waarschuwing', en: 'Warning' },
    message: { nl: 'Let op', en: 'Mind' },
    ...(alsoKeys === undefined ? {} : { alsoKeys }),
});

const contribution = (elementKey: string, open: boolean) => ({
    id: elementKey,
    elementKey,
    firstName: 'Joost',
    field: 'name' as const,
    value: 'Jumbostraat',
    amount: null,
    open: open ? ['name' as const] : [],
    hasPhoto: false,
    width: null,
    height: null,
    photoUrl: null,
    createdAt: 1,
});

const friends = (
    contributions: FriendsProps['contributions'],
    noteAt?: string,
): FriendsProps => ({
    contributions,
    edition: sampleEdition(),
    locale: 'nl',
    decision: {
        decide: () => Promise.resolve(),
        working: null,
        note: noteAt === undefined ? null : { element: noteAt, text: 'Gedaan' },
        problem: null,
        clear: () => undefined,
    },
    secret: null,
    busy: false,
    photos: new Map(),
});

describe('elementIssues', () => {
    it('keeps the messages of the element and puts those about amounts at their field', () => {
        const space = spaceOfKey('space.01');
        const name = issue('space.01', 'name');
        const amount = issue('space.01', 'amounts.rent');
        const other = issue('space.03', 'name');
        const group = issue('pawn.01', 'photo', ['space.01']);

        expect(
            elementIssues([name, amount, other, group], 'space.01', space),
        ).toEqual({ own: [name, amount, group], top: [name, group] });
    });

    it('shows the amounts of a space on its deed too', () => {
        const amount = issue('space.01', 'amount');

        expect(
            elementIssues([amount], 'deed.01', spaceOfKey('deed.01')),
        ).toEqual({ own: [amount], top: [] });
        expect(elementIssues([amount], 'card.chance.01', undefined)).toEqual({
            own: [],
            top: [],
        });
    });
});

describe('friendsFor', () => {
    it('keeps what friends sent for the element, its space and its group', () => {
        const space = spaceOfKey('space.01');
        const own = contribution('space.01', true);
        const done = contribution('space.01', false);
        const town = contribution('group.brown', true);
        const elsewhere = contribution('space.03', true);
        const result = friendsFor(
            friends([own, done, town, elsewhere]),
            'space.01',
            space,
        );

        expect(result.incoming).toEqual([own, town]);
        expect(result.here('group.brown')).toBe(true);
        expect(result.here('space.03')).toBe(false);
        expect(result.decided).toBe(false);
    });

    it('keeps the line after a decision with its element', () => {
        expect(
            friendsFor(friends([], 'pawn.01'), 'pawn.01', undefined).decided,
        ).toBe(true);
        expect(
            friendsFor(friends([], 'pawn.02'), 'pawn.01', undefined).decided,
        ).toBe(false);
        expect(friendsFor(undefined, 'pawn.01', undefined)).toMatchObject({
            incoming: [],
            decided: false,
        });
    });
});
