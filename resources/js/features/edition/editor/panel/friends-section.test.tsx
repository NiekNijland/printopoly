import { screen } from '@testing-library/react';

import { renderWithI18n } from '@/testing/render';

import { DecisionLines } from './friends-section';

describe('DecisionLines', () => {
    it('shows the note and the problem of a decision only at their own element', () => {
        renderWithI18n(
            <DecisionLines
                note={{ element: 'space.01', text: 'Toegepast op Molenweg' }}
                problem={{ element: 'space.03', text: 'Dat ging mis' }}
                here={(element) => element === 'space.01'}
            />,
        );

        expect(screen.getByRole('status')).toHaveTextContent(
            'Toegepast op Molenweg',
        );
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('shows a problem as an alert', () => {
        renderWithI18n(
            <DecisionLines
                note={null}
                problem={{ element: 'space.03', text: 'Dat ging mis' }}
                here={() => true}
            />,
        );

        expect(screen.getByRole('alert')).toHaveTextContent('Dat ging mis');
    });
});
