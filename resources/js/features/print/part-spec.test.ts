import { makeEdition } from '@/testing/edition-test-utils';

import { moneyNoteOf, specOf, type SpecInput } from './part-spec';
import { NO_CHOICE, printEditionOf } from './print-page-setup';

const t = (key: string, replacements: Record<string, string | number> = {}) =>
    `${key}${JSON.stringify(replacements)}`;
const tc = (
    key: string,
    count: number,
    replacements: Record<string, string | number> = {},
) => `${key}#${String(count)}${JSON.stringify(replacements)}`;

const drawn = makeEdition({ id: 'e1' });
const input = (over: Partial<SpecInput>): SpecInput => ({
    part: 'board',
    set: 'printer',
    counted: printEditionOf(drawn, 'four'),
    drawn,
    boardForm: 'panels',
    choice: NO_CHOICE,
    moneyAmount: 'four',
    cardCount: 60,
    locale: 'nl',
    t,
    tc,
    ...over,
});

describe('specOf', () => {
    it('counts the board as panels, one whole board or sheets at home (bug 22, B243)', () => {
        expect(specOf(input({}))).toMatch(
            /^print\.spec\.printer\.board\{"panels":\d+/,
        );
        expect(specOf(input({ boardForm: 'whole' }))).toMatch(
            /^print\.spec\.printer\.board_whole\{"w":"\d+"\}$/,
        );
        expect(specOf(input({ set: 'home' }))).toMatch(
            /^print\.spec\.home\.board\{"sheets":\d+\}$/,
        );
    });

    it('counts the notes of every set for a club (UX 3 of test round 4)', () => {
        expect(
            specOf(
                input({ part: 'money', choice: { ...NO_CHOICE, copies: 3 } }),
            ),
        ).toMatch(
            /^print\.spec\.printer\.money_sets\{"notes":(\d+),"total":\d+,"copies":3/,
        );
        expect(specOf(input({ part: 'money' }))).toMatch(
            /^print\.spec\.printer\.money\{"notes":\d+,"sheets":\d+\}$/,
        );
    });

    it('says the cards of more sets, and the pages and sheets at home (R5-29, B242)', () => {
        expect(specOf(input({ part: 'cards' }))).toBeUndefined();
        expect(
            specOf(
                input({ part: 'cards', choice: { ...NO_CHOICE, copies: 2 } }),
            ),
        ).toBe('print.spec.printer.cards_sets{"cards":120,"copies":2}');
        expect(specOf(input({ part: 'cards', set: 'home' }))).toMatch(
            /^print\.spec\.home\.cards\{"pages":\d+,"sheets":\d+\}$/,
        );
    });

    it('counts the invitations and the box lid, and leaves the rest to the standard line', () => {
        expect(specOf(input({ part: 'invitation', set: 'home' }))).toMatch(
            /^print\.spec\.home\.invitations#1\{"invitations":4\}$/,
        );
        expect(specOf(input({ part: 'invitation' }))).toBe(
            'print.spec.printer.invitations#4{}',
        );
        expect(specOf(input({ part: 'box_lid' }))).toMatch(
            /^print\.spec\.printer\.box_lid\{"w":/,
        );
        expect(specOf(input({ part: 'tokens' }))).toBeUndefined();
        expect(specOf(input({ part: 'calibration' }))).toBeUndefined();
    });
});

describe('moneyNoteOf', () => {
    it('recommends the amount of the set, and warns when the pawns need more (R5-29)', () => {
        expect(moneyNoteOf(input({ set: 'home' }), 2)).toEqual({
            note: 'print.money.recommended_for.home{}',
        });
        expect(moneyNoteOf(input({}), 8)).toEqual({
            note: 'print.money.too_little{"pawns":8,"players":4}',
            warn: false,
        });
        expect(
            moneyNoteOf(
                input({ choice: { ...NO_CHOICE, moneyAmount: 'four' } }),
                2,
            ),
        ).toEqual({});
    });
});
