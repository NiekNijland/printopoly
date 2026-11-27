import { fireEvent, screen } from '@testing-library/react';

import { renderWithI18n } from '@/testing/render';

import type { FriendAmount } from './friend-amount';
import {
    FriendAmountField,
    FriendPhotoField,
    FriendValueField,
} from './friend-fields';

const amountOf = (patch: Partial<FriendAmount> = {}): FriendAmount => ({
    rule: { min: 1, max: 500, sign: null },
    amountText: '',
    setAmountText: vi.fn(),
    direction: -1,
    setDirection: vi.fn(),
    amountValid: true,
    amount: null,
    ...patch,
});

describe('FriendPhotoField', () => {
    it('offers to choose a photo, and to change or remove one that is chosen', () => {
        const onChoose = vi.fn<(file: File) => void>();
        const onRemove = vi.fn();
        const { container, unmount } = renderWithI18n(
            <FriendPhotoField
                photo={null}
                working={false}
                sending={false}
                onChoose={onChoose}
                onRemove={onRemove}
            />,
        );
        const input = container.querySelector('input[type="file"]');
        expect(input).toBeInstanceOf(HTMLInputElement);
        const chosen = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
        fireEvent.change(input ?? document.body, {
            target: { files: [chosen] },
        });

        expect(onChoose).toHaveBeenCalledWith(chosen);
        expect(
            screen.getByRole('button', { name: 'Kies een foto' }),
        ).toBeEnabled();

        unmount();
        renderWithI18n(
            <FriendPhotoField
                photo={{
                    upload: new Blob(),
                    url: 'blob:x',
                    width: 1,
                    height: 1,
                }}
                working={false}
                sending
                onChoose={onChoose}
                onRemove={onRemove}
            />,
        );
        expect(
            screen.getByRole('button', { name: 'Andere foto' }),
        ).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'Foto weghalen' }));
        expect(onRemove).toHaveBeenCalledTimes(1);
    });
});

describe('FriendValueField', () => {
    it('asks for a town with a counter that turns red at the limit', () => {
        const onChange = vi.fn<(value: string) => void>();
        renderWithI18n(
            <FriendValueField
                id="v"
                field="town"
                limit={3}
                value="abc"
                onChange={onChange}
            />,
        );

        fireEvent.change(screen.getByLabelText('Plaatsnaam voorstellen'), {
            target: { value: 'ab' },
        });

        expect(onChange).toHaveBeenCalledWith('ab');
        expect(screen.getByText('3 van 3 tekens')).toHaveClass('text-press');
    });
});

describe('FriendAmountField', () => {
    it('lets a new card choose to pay or receive', () => {
        const amount = amountOf();
        renderWithI18n(
            <FriendAmountField
                id="a"
                amount={amount}
                rule={{ min: 1, max: 500, sign: null }}
                format={(value) => `€ ${String(value)}`}
            />,
        );

        fireEvent.click(screen.getByRole('radio', { name: 'Ontvang' }));
        fireEvent.change(
            screen.getByRole('spinbutton', { name: 'Bedrag voorstellen' }),
            { target: { value: '7' } },
        );

        expect(amount.setDirection).toHaveBeenCalledWith(1);
        expect(amount.setAmountText).toHaveBeenCalledWith('7');
        expect(
            screen.getByText(
                'Kies een bedrag van € 1 tot € 500. Leeg laten mag.',
            ),
        ).toBeInTheDocument();
    });

    it('names the direction of a card and marks an amount out of range', () => {
        renderWithI18n(
            <FriendAmountField
                id="a"
                amount={amountOf({ amountText: '99', amountValid: false })}
                rule={{ min: 12, max: 18, sign: -1 }}
                format={String}
            />,
        );

        expect(screen.queryByRole('radio')).not.toBeInTheDocument();
        expect(screen.getByText('Betaal')).toBeInTheDocument();
        expect(
            screen.getByRole('spinbutton', { name: 'Bedrag voorstellen' }),
        ).toHaveAttribute('aria-invalid', 'true');
    });
});
