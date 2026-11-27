import { fireEvent, screen } from '@testing-library/react';

import { renderWithI18n } from '@/testing/render';

import { PartChoice } from './part-choice';
import { NO_CHOICE } from './print-page-setup';

const props = {
    choice: NO_CHOICE,
    moneyNote: { note: 'Voor 2 tot 4 spelers' },
    boardSize: '50 × 50 cm',
    active: () => false,
};

describe('PartChoice', () => {
    it('chooses the money of the set (B156)', () => {
        const onChoose = vi.fn();
        renderWithI18n(
            <PartChoice
                {...props}
                part="money"
                set="home"
                onChoose={onChoose}
            />,
        );

        expect(screen.getByText('Voor 2 tot 4 spelers')).toBeInTheDocument();
        fireEvent.click(screen.getAllByRole('radio')[1] ?? document.body);
        expect(onChoose.mock.calls[0]?.[0]).toHaveProperty('moneyAmount');
    });

    it('chooses the form of the board only for the print shop (B243)', () => {
        const onChoose = vi.fn();
        const { unmount } = renderWithI18n(
            <PartChoice
                {...props}
                part="board"
                set="printer"
                onChoose={onChoose}
            />,
        );

        fireEvent.click(screen.getByRole('radio', { name: 'Een heel bord' }));
        expect(onChoose).toHaveBeenCalledWith({ boardForm: 'whole' });
        unmount();

        const { container } = renderWithI18n(
            <PartChoice
                {...props}
                part="board"
                set="home"
                onChoose={onChoose}
            />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('counts the invitations, four to a sheet at home (B244)', () => {
        const onChoose = vi.fn();
        renderWithI18n(
            <PartChoice
                {...props}
                choice={{ ...NO_CHOICE, invitations: 9 }}
                part="invitation"
                set="home"
                onChoose={onChoose}
            />,
        );

        expect(
            screen.getByRole('textbox', { name: 'Hoeveel uitnodigingen?' }),
        ).toHaveValue('9');
        fireEvent.click(
            screen.getByRole('button', { name: 'Een uitnodiging meer' }),
        );
        expect(onChoose).toHaveBeenCalledWith({ invitations: 10 });
    });
});
