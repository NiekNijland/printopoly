import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { resolveEdition } from '@/lib/render/edition-resolve';
import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { CardTextInsertDialog } from './card-text-insert-dialog';

const open = (withAmount: boolean, amount?: number) => {
    const onPick = vi.fn();
    renderWithI18n(
        <CardTextInsertDialog
            open
            onOpenChange={vi.fn()}
            onCloseAutoFocus={vi.fn()}
            resolved={resolveEdition(sampleEdition())}
            amount={amount}
            withAmount={withAmount}
            onPick={onPick}
        />,
    );

    return onPick;
};

describe('CardTextInsertDialog', () => {
    it('picks the amount, a word and a space', async () => {
        const user = userEvent.setup();
        const onPick = open(true, 50);

        expect(
            screen.getByRole('button', { name: /Bedrag van de kaart/ }),
        ).not.toHaveTextContent('Vul eerst');

        await user.click(
            screen.getByRole('button', { name: /Bedrag van de kaart/ }),
        );
        await user.click(
            screen.getAllByRole('button', { name: /Woord/ })[0] ??
                document.body,
        );
        await user.click(screen.getByRole('button', { name: /Kroonplein/ }));

        expect(onPick).toHaveBeenNthCalledWith(1, { type: 'amount' });
        expect(onPick.mock.calls[1]?.[0]).toMatchObject({ type: 'word' });
        expect(onPick).toHaveBeenNthCalledWith(3, {
            type: 'space',
            position: 39,
        });
    });

    it('offers no amount for a text without one, and says when nothing is found', async () => {
        const user = userEvent.setup();
        open(false);

        expect(
            screen.getByText(/Kies een vak, een woord of de munt/),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /Bedrag van de kaart/ }),
        ).not.toBeInTheDocument();

        await user.type(screen.getByLabelText('Zoek een vak of woord'), 'zzz');

        expect(screen.getByRole('status')).toHaveTextContent(
            'Geen vak gevonden.',
        );
    });
});
