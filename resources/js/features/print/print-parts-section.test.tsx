import { screen, within } from '@testing-library/react';

import { renderWithI18n } from '@/testing/render';

import { PrintPartsSection } from './print-parts-section';

describe('PrintPartsSection', () => {
    it('puts the test sheet first, then the game and the extras, with a link to the guide (B149, B205)', () => {
        renderWithI18n(
            <PrintPartsSection
                set="home"
                guideHref="/nl/printgids"
                rememberFailed
                reusing={false}
                calibration={<li>proefvel</li>}
                rowOf={(part, index) => (
                    <li key={part}>{`${part} ${String(index)}`}</li>
                )}
            />,
        );

        const lists = screen.getAllByRole('list');
        expect(
            within(lists[0] ?? document.body).getByText('proefvel'),
        ).toBeInTheDocument();
        expect(lists[1]).toHaveTextContent(
            'board 0cards 1money 2tokens 3box_lid 4',
        );
        expect(lists[2]).toHaveTextContent('invitation 5rules_booklet 6');
        expect(screen.getAllByRole('status')).toHaveLength(1);
        expect(
            screen.getByRole('link', { name: /printgids/i }),
        ).toHaveAttribute('href', '/nl/printgids');
    });

    it('says it looks for a job made before', () => {
        renderWithI18n(
            <PrintPartsSection
                set="printer"
                guideHref="/g"
                rememberFailed={false}
                reusing
                calibration={null}
                rowOf={() => null}
            />,
        );

        expect(screen.getByRole('status')).toBeInTheDocument();
    });
});
