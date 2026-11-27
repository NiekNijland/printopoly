import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LiveEdition, memorySession } from '@/features/edition/testing/session';
import type { Edition } from '@/lib/render/edition-types';
import { installMemoryServices, sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { GeneralFields } from './general-fields';

const setup = (edition: Edition = sampleEdition()) => {
    installMemoryServices();
    const session = memorySession(edition);
    renderWithI18n(
        <LiveEdition session={session}>
            {(current) => (
                <GeneralFields
                    session={session}
                    edition={current}
                    interfaceLanguage="nl"
                />
            )}
        </LiveEdition>,
    );

    return Promise.resolve({ session, user: userEvent.setup() });
};

describe('GeneralFields', () => {
    it('renames the edition and switches the subtitle off with Tonen', async () => {
        const { session, user } = await setup();
        const name = screen.getByLabelText('Naam');
        await user.clear(name);
        await user.type(name, 'De Kroeg');
        expect(session.edition.name).toBe('De Kroeg');

        await user.click(screen.getByRole('checkbox', { name: 'Tonen' }));
        expect(session.edition.elements['board_center']?.subtitle).toBe('');
        expect(screen.getByLabelText('Ondertitel')).toBeDisabled();
    });

    describe('one currency field (B147)', () => {
        it('offers the four currencies and an own currency in one field', async () => {
            const { session, user } = await setup();
            const field = screen.getByLabelText('Munt');

            expect(
                within(field)
                    .getAllByRole('option')
                    .map((option) => option.textContent),
            ).toEqual(['€ euro', 'M', '$ dollar', '£ pond', 'Eigen munt']);

            await user.selectOptions(field, 'custom');
            // An empty own currency says it is still the euro (bug 35).
            expect(
                screen.getByText(
                    'Vul een naam of een teken in. Tot dan blijft de munt € euro.',
                ),
            ).toBeInTheDocument();
            await user.type(
                screen.getByLabelText('Naam van de munt'),
                'Kroketten',
            );
            await user.type(screen.getByLabelText('Teken'), 'K');
            expect(session.edition.elements['words.currency']).toEqual({
                name: 'Kroketten',
                text: 'K',
            });
            expect(
                screen.getByText('Zo staat een bedrag op het bord: K 200'),
            ).toBeInTheDocument();
            expect(
                screen.queryByTestId('currency-custom-empty'),
            ).not.toBeInTheDocument();
        });

        it('drops the own name and sign in one undo step when a standard currency is picked', async () => {
            const { session, user } = await setup({
                ...sampleEdition(),
                elements: {
                    'words.currency': { name: 'Kroketten', text: 'K' },
                },
            });
            const field = screen.getByLabelText('Munt');
            expect(field).toHaveValue('custom');

            await user.selectOptions(field, 'usd');
            expect(session.edition.currency).toBe('usd');
            expect(session.edition.elements['words.currency']).toBeUndefined();

            session.undo();
            expect(session.edition.elements['words.currency']).toEqual({
                name: 'Kroketten',
                text: 'K',
            });
        });
    });

    it('says what a language switch changed, and keeps a name that is cleared while typing', async () => {
        const { session, user } = await setup();

        await user.selectOptions(
            screen.getByLabelText('Taal van bord en kaarten'),
            'en',
        );
        expect(session.edition.language).toBe('en');
        expect(screen.getByRole('status')).not.toBeEmptyDOMElement();

        const name = screen.getByLabelText('Naam');
        await user.clear(name);
        expect(name).toHaveValue('');
        expect(session.edition.name).toBe('Zaterdagclub');
        await user.tab();
        expect(name).toHaveValue('Zaterdagclub');
    });

    it('puts a typed subtitle back to the standard with Standaard', async () => {
        const { session, user } = await setup();

        await user.type(screen.getByLabelText('Ondertitel'), 'Sinds 1990');
        expect(session.edition.elements['board_center']?.subtitle).toBe(
            'Sinds 1990',
        );
        await user.click(screen.getByRole('button', { name: /Standaard/ }));
        expect(
            session.edition.elements['board_center']?.subtitle,
        ).toBeUndefined();
    });
});
