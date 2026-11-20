import { describe, expect, it } from 'vitest';
import { checkText } from './checks';
import { issuesFor, summarize } from './summary';

const long = (key: string, field = 'text') =>
    checkText(key, { field, fit: { fits: false, excessCharacters: 5 } });

describe('summarize', () => {
    it('says nothing found and what was checked, as in the design', () => {
        const s = summarize([], 'nl');
        expect(s.label).toBe(
            'Controle: niets gevonden. Gecontroleerd: fotoscherpte, tekst en bordmaat.',
        );
        expect(s.count).toBe(0);
        expect(summarize([], 'en').label).toBe(
            'Check: nothing found. Checked: photo sharpness, text and board size.',
        );
    });

    it('shows the count like the editor header', () => {
        const issues = [...long('a'), ...long('b')];
        expect(summarize(issues, 'nl')).toMatchObject({
            label: 'Controle: 2',
            count: 2,
            warnings: 2,
            errors: 0,
        });
        expect(summarize(issues, 'en').label).toBe('Check: 2');
    });
});

describe('issuesFor', () => {
    it('selects the issues for an element, optionally one field', () => {
        const issues = [
            ...long('a', 'name'),
            ...long('a', 'text'),
            ...long('b'),
        ];
        expect(issuesFor(issues, 'a')).toHaveLength(2);
        expect(issuesFor(issues, 'a', 'name')).toHaveLength(1);
        expect(issuesFor(issues, 'c')).toEqual([]);
    });
});
