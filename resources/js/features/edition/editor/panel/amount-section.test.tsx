import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'react';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { resolveEdition } from '@/lib/render/edition-resolve';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from '../element-panel';

describe('AmountSection', () => {
    it('changes an amount of a space within 20% and puts it back (B132)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(screen.getByRole('button', { name: 'Prijs hoger' }));
        expect(session.edition.elements['space.01']?.amounts).toEqual({
            price: 61,
        });

        const price = screen.getByLabelText('Prijs');
        await user.clear(price);
        await user.type(price, '90');
        // 90 is above 72: the edition keeps the last good amount and the field says why.
        expect(session.edition.elements['space.01']?.amounts?.price).not.toBe(
            90,
        );
        expect(
            screen.getByText('Kies een bedrag tussen 48 en 72.'),
        ).toBeInTheDocument();
        await user.clear(price);
        await user.type(price, '70');
        expect(session.edition.elements['space.01']?.amounts?.price).toBe(70);
    });

    it('lets the owner choose pay, collect or no amount on a standard card (R5-11)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('card.chest.03');

        const Live = () => {
            const [edition, setEdition] = useState(session.edition);
            useEffect(
                () => session.subscribe(() => setEdition(session.edition)),
                [],
            );

            return (
                <ElementPanel
                    {...props}
                    edition={edition}
                    resolved={resolveEdition(edition)}
                />
            );
        };

        renderWithI18n(<Live />);
        const direction = screen.getByRole('group', {
            name: 'Betalen of ontvangen',
        });
        expect(
            within(direction).getByRole('radio', { name: 'Betalen' }),
        ).toHaveAttribute('aria-checked', 'true');

        await user.click(
            within(direction).getByRole('radio', { name: 'Ontvangen' }),
        );
        expect(session.edition.elements['card.chest.03']?.amount).toBe(50);
        expect(screen.getByLabelText('Bedrag op de kaart')).toHaveValue(50);

        await user.click(
            within(direction).getByRole('radio', { name: 'Geen bedrag' }),
        );
        expect(session.edition.elements['card.chest.03']?.amount).toBe(0);
        expect(
            screen.queryByLabelText('Bedrag op de kaart'),
        ).not.toBeInTheDocument();

        // Back to paying the standard amount: nothing is stored.
        await user.click(
            within(direction).getByRole('radio', { name: 'Betalen' }),
        );
        expect(
            session.edition.elements['card.chest.03']?.amount,
        ).toBeUndefined();
    });

    // UX 7 (ronde 3): an amount outside the limits no longer jumps back without a word.
    it('sets an amount outside the limits to the nearest limit and says so', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);
        const price = screen.getByLabelText('Prijs');
        await user.clear(price);
        await user.type(price, '90{Enter}');

        expect(session.edition.elements['space.01']?.amounts?.price).toBe(72);
        expect(
            screen.getByText('Maximaal 72. Het bedrag staat nu op 72.'),
        ).toHaveAttribute('role', 'status');

        await user.clear(price);
        await user.type(price, '10');
        await user.tab();
        expect(session.edition.elements['space.01']?.amounts?.price).toBe(48);
        expect(
            screen.getByText('Minimaal 48. Het bedrag staat nu op 48.'),
        ).toBeInTheDocument();
    });

    it('puts an amount back to the standard amount', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01', {
            elements: { 'space.01': { amounts: { price: 70 } } },
        });

        renderWithI18n(<ElementPanel {...props} />);
        expect(screen.getByLabelText('Prijs')).toHaveValue(70);
        // Only the field that differs has the button.
        expect(
            screen.queryByRole('button', {
                name: 'Hypotheek terug naar standaard',
            }),
        ).toBeNull();
        await user.click(
            screen.getByRole('button', { name: 'Prijs terug naar standaard' }),
        );
        expect(session.edition.elements['space.01']?.amounts).toBeUndefined();
    });

    it('prefills a card amount, writes it signed, and adds what it is for (B132)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('card.chest.03');

        renderWithI18n(<ElementPanel {...props} />);
        const field = screen.getByLabelText('Bedrag op de kaart');
        // "Betaal 50" is prefilled as 50; paying stays paying.
        expect(field).toHaveValue(50);
        expect(field).toHaveAccessibleDescription(
            'Standaard bedrag. Kies 40 tot 60.',
        );
        await user.clear(field);
        await user.type(field, '55');
        expect(session.edition.elements['card.chest.03']?.amount).toBe(-55);

        await user.type(
            screen.getByLabelText('Waarvoor', { exact: false }),
            'je tandarts',
        );
        expect(session.edition.elements['card.chest.03']?.purpose).toBe(
            'je tandarts',
        );
    });

    it('offers the amount a rewritten card text names for the line at the bottom (Niek, 22 nov)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('card.chest.03', {
            elements: {
                'card.chest.03': {
                    text: 'De kartbaan moet schoon: betaal 45.',
                },
            },
        });

        renderWithI18n(<ElementPanel {...props} />);
        expect(
            screen.getByText(/Je tekst noemt een bedrag\. Zet „Betaal €\s45”/),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Zet onderaan' }));
        expect(session.edition.elements['card.chest.03']?.amount).toBe(-45);
    });

    it('says the limits up front, why a tiny amount is fixed, and that rent and mortgage do not follow the price (UX 7)', async () => {
        const user = userEvent.setup();
        const { props } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);
        expect(
            screen.getByText(
                /Huur en hypotheek pas je apart aan: ze volgen de prijs niet\./,
            ),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Tonen' }));
        // The base rent of Molenweg is 2: 20% of it is less than 1.
        expect(
            screen.getAllByText(
                'Dit bedrag is te klein om aan te passen: 20% ervan is minder dan 1.',
            ).length,
        ).toBeGreaterThan(0);
    });

    it('points to an extra card for an amount outside the limits (UX 7, B182)', async () => {
        const { props } = await setup('card.chest.03');

        renderWithI18n(<ElementPanel {...props} />);
        expect(
            screen.getByText(
                /Dat kan op een extra kaart: kies Kaart toevoegen onder de stapel\./,
            ),
        ).toBeInTheDocument();
    });

    it('writes the purpose example in the currency of the edition (bug 38)', async () => {
        const { props } = await setup('card.chest.03', {
            elements: { 'words.currency': { name: 'Kroketten', text: 'K' } },
        });

        renderWithI18n(<ElementPanel {...props} />);
        expect(
            screen.getByText(/Betaal K 50 voor je taalcursus/),
        ).toBeInTheDocument();
    });

    it('has no amount field on a card without money', async () => {
        const { props } = await setup('card.chance.01');

        renderWithI18n(<ElementPanel {...props} />);
        expect(screen.queryByLabelText('Betalen')).toBeNull();
        expect(screen.queryByLabelText('Ontvangen')).toBeNull();
        expect(screen.queryByRole('heading', { name: /Bedragen/ })).toBeNull();
        expect(screen.getByText('Standaardtekst')).toBeInTheDocument();
    });
});
