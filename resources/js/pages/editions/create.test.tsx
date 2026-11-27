import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import EditionsCreate from '@/pages/editions/create';
import { installMemoryServices } from '@/testing/editions';
import { visit } from '@/testing/inertia';
import { renderWithI18n } from '@/testing/render';

describe('Nieuwe editie', () => {
    const language = (name: 'Nederlands' | 'English') =>
        screen.getByRole('radio', { name });

    it('starts with everything filled in, the theme and currency folded into one line each and no parts (B198)', async () => {
        const user = userEvent.setup();

        installMemoryServices();
        renderWithI18n(<EditionsCreate />);

        expect(screen.getByLabelText('Naam van je editie')).toHaveValue(
            'Onze editie',
        );
        expect(language('Nederlands')).toBeChecked();
        expect(screen.getByRole('button', { name: /Munt/ })).toHaveTextContent(
            '€ euro',
        );

        const theme = screen.getByRole('button', { name: /Thema/ });
        expect(theme).toHaveTextContent('Klassiek');
        expect(theme).toHaveAttribute('aria-expanded', 'false');
        expect(
            screen.queryByRole('radio', { name: /Klassiek/ }),
        ).not.toBeInTheDocument();
        // Parts and the board size are chosen on the print page and in the editor (B198).
        expect(
            screen.queryByRole('button', { name: /Onderdelen/ }),
        ).not.toBeInTheDocument();
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        expect(
            screen.queryByRole('radio', { name: /Modern vierkant/ }),
        ).not.toBeInTheDocument();

        await user.click(theme);
        expect(theme).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('radio', { name: /Klassiek/ })).toBeChecked();
    });

    it('puts the name next to the button, without autofocus, so the first Tab reaches the skip link (vindbaarheid 9)', () => {
        installMemoryServices();
        renderWithI18n(<EditionsCreate />);

        const card = screen.getByRole('complementary', { name: 'Je editie' });
        const name = screen.getByLabelText('Naam van je editie');
        expect(card).toContainElement(name);
        expect(card).toContainElement(
            screen.getByRole('button', { name: 'Editie maken' }),
        );
        expect(name).not.toHaveFocus();
    });

    it('lets the currency follow the language: pound in English (B154)', async () => {
        const user = userEvent.setup();

        installMemoryServices();
        renderWithI18n(<EditionsCreate />);
        const currency = screen.getByRole('button', { name: /Munt/ });
        await user.click(language('English'));
        expect(currency).toHaveTextContent('£ pond');

        await user.click(language('Nederlands'));
        expect(currency).toHaveTextContent('€ euro');
    });

    it('makes the edition in the currency the page shows, also after a language switch (bug 29)', async () => {
        const user = userEvent.setup();

        const services = installMemoryServices();
        renderWithI18n(<EditionsCreate />);
        await user.click(language('English'));
        await user.click(screen.getByRole('button', { name: /Munt/ }));
        await user.click(screen.getByRole('radio', { name: /€ euro/ }));
        expect(screen.getByRole('button', { name: /Munt/ })).toHaveTextContent(
            '€ euro',
        );
        // A currency the visitor picked stays when the language changes again.
        await user.click(language('Nederlands'));
        await user.click(language('English'));
        expect(screen.getByRole('button', { name: /Munt/ })).toHaveTextContent(
            '€ euro',
        );

        await user.click(screen.getByRole('button', { name: 'Editie maken' }));
        await waitFor(() => expect(visit).toHaveBeenCalled());
        const [summary] = await services.repository.list();
        const edition = await services.repository.get(summary?.id ?? '');
        expect(edition?.language).toBe('en');
        expect(edition?.currency).toBe('eur');
    });

    it('makes a blank English edition in the theme the page shows (bug 42)', async () => {
        const user = userEvent.setup();

        const services = installMemoryServices();
        renderWithI18n(<EditionsCreate template="party" />);
        // A template in Riso first, then back to blank, then English.
        expect(screen.getByRole('button', { name: /Thema/ })).toHaveTextContent(
            'Riso',
        );
        await user.click(screen.getByRole('radio', { name: /^Leeg/ }));
        await user.click(language('English'));
        expect(screen.getByRole('button', { name: /Thema/ })).toHaveTextContent(
            'Klassiek',
        );

        await user.click(screen.getByRole('button', { name: 'Editie maken' }));
        await waitFor(() => expect(visit).toHaveBeenCalled());
        const [summary] = await services.repository.list();
        const edition = await services.repository.get(summary?.id ?? '');
        expect(edition?.theme).toBe('classic');
        expect(edition?.currency).toBe('gbp');
        expect(edition?.template).toBe('empty');
    });

    it('starts blank from a link to a template that is no longer offered (B201)', () => {
        installMemoryServices();
        renderWithI18n(<EditionsCreate template="kidsparty" />);

        expect(screen.getByRole('radio', { name: /^Standaard/ })).toBeChecked();
        expect(screen.getByLabelText('Naam van je editie')).toHaveValue(
            'Onze editie',
        );
    });

    it('creates the edition in this browser and opens the editor', async () => {
        const user = userEvent.setup();
        const { repository } = installMemoryServices();

        renderWithI18n(<EditionsCreate />);
        const name = screen.getByLabelText('Naam van je editie');
        await user.clear(name);
        await user.type(name, 'Zaterdagclub');
        await user.click(screen.getByRole('button', { name: /Thema/ }));
        await user.click(screen.getByRole('radio', { name: /Riso/ }));
        await user.click(screen.getByRole('button', { name: 'Editie maken' }));

        await waitFor(() => expect(visit).toHaveBeenCalled());
        const [created] = await repository.list();
        expect(created?.name).toBe('Zaterdagclub');
        const edition = await repository.get(created?.id ?? '');
        expect(edition).toMatchObject({
            theme: 'riso',
            language: 'nl',
            currency: 'eur',
        });
        expect(visit.mock.calls[0]?.[0]).toMatchObject({
            url: `/nl/editor/${created?.id ?? ''}`,
        });
    });

    it('does not submit without a name', async () => {
        const user = userEvent.setup();

        installMemoryServices();
        renderWithI18n(<EditionsCreate />);
        await user.clear(screen.getByLabelText('Naam van je editie'));

        expect(
            screen.getByRole('button', { name: 'Editie maken' }),
        ).toBeDisabled();
    });
});
