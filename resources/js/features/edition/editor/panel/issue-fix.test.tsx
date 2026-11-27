import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from '../element-panel';

describe('IssueFix', () => {
    // Bug 8 (ronde 3): "Betaal 45" above "Betaal € 50"; one tap makes them agree.
    it('sets the card amount to the amount the text names', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('card.chest.03', {
            elements: { 'card.chest.03': { text: 'Betaal 45.' } },
            issues: [
                {
                    id: 'text.amount-differs|card.chest.03|text',
                    code: 'text.amount-differs',
                    elementKey: 'card.chest.03',
                    field: 'text',
                    severity: 'warning',
                    icon: 'triangle-alert',
                    severityLabel: { nl: 'Waarschuwing', en: 'Warning' },
                    message: {
                        nl: 'De tekst noemt 45.',
                        en: 'The text says 45.',
                    },
                    data: { mentioned: -45, allowed: true },
                },
            ],
        });

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(
            screen.getByRole('button', { name: 'Bedrag aanpassen' }),
        );

        expect(session.edition.elements['card.chest.03']?.amount).toBe(-45);
        // The number in the text becomes the amount of the card, so the fix raises no "already at the bottom"
        // (Sem, R5-11): with {amount} in the text the line at the bottom goes.
        expect(session.edition.elements['card.chest.03']?.text).toBe(
            'Betaal {amount}.',
        );
        expect(
            screen.getByText(
                'Het bedrag is nu 45. Het staat in de tekst, dus de regel onderaan valt weg.',
            ),
        ).toBeInTheDocument();
    });

    it('puts an amount that the text and the line both name into the text once (R5-11)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('card.chest.03', {
            elements: { 'card.chest.03': { text: 'Je tandarts kost je 50.' } },
            issues: [
                {
                    id: 'text.amount-twice|card.chest.03|text',
                    code: 'text.amount-twice',
                    elementKey: 'card.chest.03',
                    field: 'text',
                    severity: 'warning',
                    icon: 'triangle-alert',
                    severityLabel: { nl: 'Waarschuwing', en: 'Warning' },
                    message: { nl: 'De tekst noemt 50.', en: 'It says 50.' },
                },
            ],
        });

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(
            screen.getByRole('button', { name: 'Alleen in de tekst' }),
        );

        expect(session.edition.elements['card.chest.03']?.text).toBe(
            'Je tandarts kost je {amount}.',
        );
        expect(
            session.edition.elements['card.chest.03']?.amount,
        ).toBeUndefined();
    });

    it('turns a card whose text says the other way in one tap (R5-11)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('card.chest.03', {
            elements: {
                'card.chest.03': {
                    text: 'Je vindt geld op straat.',
                    amount: 55,
                },
            },
            issues: [
                {
                    id: 'text.amount-direction|card.chest.03|text',
                    code: 'text.amount-direction',
                    elementKey: 'card.chest.03',
                    field: 'text',
                    severity: 'warning',
                    icon: 'triangle-alert',
                    severityLabel: { nl: 'Waarschuwing', en: 'Warning' },
                    message: {
                        nl: 'De tekst zegt betalen.',
                        en: 'It says pay.',
                    },
                    data: { says: 'pay' },
                },
            ],
        });

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(
            screen.getByRole('button', { name: 'Zet op Betalen' }),
        );

        expect(session.edition.elements['card.chest.03']?.amount).toBe(-55);
        expect(
            screen.getByText('De speler betaalt nu op deze kaart.'),
        ).toBeInTheDocument();
    });

    it('moves the name off the fold lines with one tap in Controle (B183)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('board_center', {
            elements: { board_center: { centerPlace: 'middle' } },
            issues: [
                {
                    id: 'center.on-fold|board_center|center-place',
                    code: 'center.on-fold',
                    elementKey: 'board_center',
                    field: 'center-place',
                    severity: 'warning',
                    icon: 'triangle-alert',
                    severityLabel: { nl: 'Waarschuwing', en: 'Warning' },
                    message: {
                        nl: 'De naam ligt over de vouwlijnen.',
                        en: 'The name lies across the fold lines.',
                    },
                },
            ],
        });
        renderWithI18n(<ElementPanel {...props} />);

        await user.click(screen.getByRole('button', { name: 'Verschuiven' }));

        expect(
            session.edition.elements['board_center']?.centerPlace,
        ).toBeUndefined();
        expect(
            await screen.findByText('Verschoven, van de vouwlijnen af.'),
        ).toBeVisible();
    });
});
