import { describe, expect, it } from 'vitest';
import { issue } from './checks-issue';

describe('issue', () => {
    it('builds the id from the code, the element and the field', () => {
        const made = issue('card.empty', 'card.chance.01', 'text', 'warning', {
            nl: 'Leeg',
            en: 'Empty',
        });

        expect(made).toEqual({
            id: 'card.empty|card.chance.01|text',
            code: 'card.empty',
            elementKey: 'card.chance.01',
            field: 'text',
            severity: 'warning',
            icon: 'triangle-alert',
            severityLabel: { nl: 'Waarschuwing', en: 'Warning' },
            message: { nl: 'Leeg', en: 'Empty' },
        });
    });

    it('gives an error its own icon and label, and keeps the data', () => {
        const made = issue(
            'amount.out-of-range',
            'space.01',
            'price',
            'error',
            { nl: 'Te hoog', en: 'Too high' },
            { value: 900 },
        );

        expect(made.icon).toBe('octagon-x');
        expect(made.severityLabel).toEqual({ nl: 'Fout', en: 'Error' });
        expect(made.data).toEqual({ value: 900 });
    });
});
