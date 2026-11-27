import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithI18n } from '@/testing/render';
import type { BoardForm } from '@/types/generated';

import { BoardFormChoice } from './board-form-choice';

describe('BoardFormChoice', () => {
    it('offers stickers or a whole board and says what the chosen one is', () => {
        renderWithI18n(
            <BoardFormChoice
                value="panels"
                onChange={() => undefined}
                size="50 × 50 cm"
            />,
        );

        expect(
            screen.getByRole('radiogroup', { name: 'Hoe wil je het bord?' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('radio', { name: 'Stickers voor je eigen bord' }),
        ).toBeChecked();
        expect(
            screen.getByText(
                'Stickers die je plakt op het bord dat je al hebt. Een stickerdrukker maakt ze.',
            ),
        ).toBeInTheDocument();
    });

    it('names the size of a whole board', () => {
        renderWithI18n(
            <BoardFormChoice
                value="whole"
                onChange={() => undefined}
                size="50 × 50 cm"
            />,
        );

        expect(
            screen.getByText(
                'Eén stuk van 50 × 50 cm, op forex, dibond of als poster. Een drukkerij voor groot formaat maakt het.',
            ),
        ).toBeInTheDocument();
    });

    it('passes on a new choice and keeps the chosen one when it is clicked again', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn<(form: BoardForm) => void>();
        renderWithI18n(
            <BoardFormChoice
                value="panels"
                onChange={onChange}
                size="50 × 50 cm"
            />,
        );

        await user.click(screen.getByRole('radio', { name: 'Een heel bord' }));
        await user.click(
            screen.getByRole('radio', { name: 'Stickers voor je eigen bord' }),
        );

        expect(onChange).toHaveBeenCalledExactlyOnceWith('whole');
    });

    it('can be switched off', () => {
        renderWithI18n(
            <BoardFormChoice
                value="panels"
                onChange={() => undefined}
                size="x"
                disabled
            />,
        );

        expect(
            screen.getByRole('radio', { name: 'Een heel bord' }),
        ).toBeDisabled();
    });
});
