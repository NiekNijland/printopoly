import { describe, expect, it } from 'vitest';

import { runChecks } from '@/lib/checks/checks';
import { makeEdition } from '@/lib/edition/test-utils';
import { DEFAULT_PARTS } from '@/lib/edition/types';

import { buildCheckInput } from './checks-input';

function nameIssues(name: string, parts: Partial<typeof DEFAULT_PARTS>) {
    const edition = {
        ...makeEdition({ parts: { ...DEFAULT_PARTS, ...parts } }),
        name,
    };

    return runChecks(buildCheckInput(edition, new Map(), new Map())).filter(
        (issue) => issue.code === 'text.name-too-long',
    );
}

describe('Controle for an edition name that does not fit (bug 14 of test round 3)', () => {
    const word =
        'Kerstfamilieweekendspelavondkampioenschapstoernooiwinnaarsbekerpraatje';

    it('says where the name does not fit, on the booklet and on the money', () => {
        const issues = nameIssues(word, { rulesBooklet: true, money: true });

        expect(issues.map((issue) => issue.elementKey)).toEqual([
            'rules_booklet',
            'note.500',
        ]);
        expect(issues[0]?.message.nl).toContain(
            'De naam van de editie past niet op het spelregelboekje',
        );
    });

    it('is silent for a long name that wraps, and for parts that are off', () => {
        expect(
            nameIssues('Familie Van der Meulen-Jansen Kerstspel 2026', {
                rulesBooklet: true,
                money: true,
            }),
        ).toEqual([]);
        expect(nameIssues(word, { rulesBooklet: false, money: false })).toEqual(
            [],
        );
    });
});
