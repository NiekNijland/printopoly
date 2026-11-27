import { render } from '@testing-library/react';

import { makeEdition } from '@/testing/edition-test-utils';

import { ContributionPreview } from './contribution-preview';
import type { BoxContributionData } from './types';

const contribution: Pick<
    BoxContributionData,
    'elementKey' | 'field' | 'value' | 'width' | 'height'
> = {
    elementKey: 'space.01',
    field: 'name',
    value: 'Beukenlaan',
    width: null,
    height: null,
};

describe('ContributionPreview', () => {
    it('draws the element with the proposed name, without changing the edition', () => {
        const edition = makeEdition();

        const { container } = render(
            <ContributionPreview
                edition={edition}
                contribution={contribution}
                photoUrl={null}
                photos={new Map()}
            />,
        );

        expect(container.textContent).toContain('Beukenlaan');
        expect(container.querySelector('img')).toBeNull();
        expect(edition.elements['space.01']).toBeUndefined();
    });

    it('draws the proposed photo on it', () => {
        const { container } = render(
            <ContributionPreview
                edition={makeEdition()}
                contribution={{ ...contribution, width: 800, height: 600 }}
                photoUrl="blob:photo"
                photos={new Map()}
            />,
        );

        expect(container.querySelector('img')?.getAttribute('src')).toBe(
            'blob:photo',
        );
    });

    it('shows a new card with its text and amount', () => {
        const { container } = render(
            <ContributionPreview
                edition={makeEdition({ parts: { cards: false } })}
                contribution={{
                    elementKey: 'card.chance.17',
                    field: 'text',
                    value: 'Je wint de pubquiz.',
                    amount: 25,
                    width: null,
                    height: null,
                }}
                photoUrl={null}
                photos={new Map()}
            />,
        );

        expect(container.textContent).toContain('pubquiz');
        expect(container.textContent).toContain('25');
    });

    it('shows a town on the first street of its group, in a box of the given size', () => {
        const { container } = render(
            <ContributionPreview
                edition={makeEdition()}
                contribution={{
                    elementKey: 'group.brown',
                    field: 'town',
                    value: 'Raalte',
                    width: null,
                    height: null,
                }}
                photoUrl={null}
                photos={new Map()}
                maxWidth={100}
                maxHeight={100}
            />,
        );

        const box = container.firstElementChild;
        expect(container.textContent).toContain('Raalte');
        expect(
            box instanceof HTMLElement ? parseFloat(box.style.width) : 0,
        ).toBeLessThanOrEqual(100);
    });
});
