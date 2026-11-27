import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CheckIssue } from '@/lib/render/checks-types';
import { makeEdition } from '@/testing/edition-test-utils';
import { renderWithI18n } from '@/testing/render';

import { ReviewList } from './review-list';

const reviewQuery = ({
    elementKey,
    field,
}: Pick<CheckIssue, 'elementKey' | 'field'>) => {
    const issue: CheckIssue = {
        id: `text.too-long|${elementKey}|${field}`,
        code: 'text.too-long',
        elementKey,
        field,
        severity: 'warning',
        icon: 'triangle-alert',
        severityLabel: { nl: 'Waarschuwing', en: 'Warning' },
        message: { nl: 'Te lang.', en: 'Too long.' },
    };
    renderWithI18n(
        <ReviewList issues={[issue]} edition={makeEdition()} locale="nl" />,
    );
    const href = screen.getByRole('link').getAttribute('href') ?? '';

    return Object.fromEntries(
        new URL(href, 'http://localhost').searchParams.entries(),
    );
};

describe('the way from Nog even nakijken into the editor (B197)', () => {
    it('opens an element at its field', () => {
        expect(
            reviewQuery({ elementKey: 'card.chance.03', field: 'photo' }),
        ).toEqual({ element: 'card.chance.03', field: 'photo' });
    });

    it('opens a key of the edition panel the same way: the editor finds its section', () => {
        expect(
            reviewQuery({ elementKey: 'words.jail', field: 'text' }),
        ).toEqual({ element: 'words.jail', field: 'text' });
    });

    it('opens the list of open messages for a message without an element', () => {
        expect(reviewQuery({ elementKey: 'edition', field: '' })).toEqual({
            check: '1',
        });
    });
});
