import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import EditionsSample from '@/pages/editions/sample';
import { installMemoryServices } from '@/testing/editions';
import { setPage, visit } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

const useButton = () =>
    screen.getByRole('button', { name: 'Begin met deze als basis' });

describe('EditionsSample', () => {
    it('shows the sample edition without template tabs', () => {
        installMemoryServices();

        renderWithI18n(<EditionsSample />);

        expect(
            screen.getByRole('heading', { name: 'Voorbeeld: Zaterdagclub' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Zo ziet een editie eruit/),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('tab', { name: 'Huisregels' }),
        ).not.toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Bord' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
    });

    it('shows the sample for a template that does not exist', () => {
        installMemoryServices();

        renderWithI18n(<EditionsSample template="nonsense" />);

        expect(
            screen.getByRole('heading', { name: 'Voorbeeld: Zaterdagclub' }),
        ).toBeInTheDocument();
    });

    it('shows the English sample on an English page', () => {
        setPage(fakePage({ locale: 'en' }));
        installMemoryServices();

        renderWithI18n(<EditionsSample />, 'en');

        expect(
            screen.getByRole('heading', { level: 1, name: /Saturday Club/ }),
        ).toBeInTheDocument();
    });

    it('has no card counter for the sample cards', async () => {
        const user = userEvent.setup();
        installMemoryServices();
        renderWithI18n(<EditionsSample />);

        await user.click(screen.getByRole('tab', { name: 'Algemeen Fonds' }));

        expect(
            screen.getByRole('tab', { name: 'Algemeen Fonds' }),
        ).toHaveAttribute('aria-selected', 'true');
        expect(
            screen.queryByRole('button', { name: 'Volgende kaart' }),
        ).not.toBeInTheDocument();
    });

    it('offers the deed of a property and goes round the template cards both ways', async () => {
        const user = userEvent.setup();
        installMemoryServices();
        renderWithI18n(<EditionsSample template="village" />);

        await user.click(screen.getByRole('tab', { name: 'Eigendomsbewijs' }));
        expect(
            screen.getByRole('tab', { name: 'Eigendomsbewijs' }),
        ).toHaveAttribute('aria-selected', 'true');

        await user.click(screen.getByRole('tab', { name: 'Algemeen Fonds' }));
        expect(screen.getByText('Kaart 1 van 16')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Vorige kaart' }));
        expect(screen.getByText('Kaart 16 van 16')).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Volgende kaart' }),
        );
        expect(screen.getByText('Kaart 1 van 16')).toBeInTheDocument();
    });

    it('says so when the copy fails, and lets you try again', async () => {
        const user = userEvent.setup();
        const { repository } = installMemoryServices();
        const createFrom = vi
            .spyOn(repository, 'createFrom')
            .mockRejectedValue(new Error('full'));
        renderWithI18n(<EditionsSample />);

        await user.click(useButton());

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'De kopie is niet gelukt. Probeer het nog een keer.',
        );
        expect(useButton()).toBeEnabled();
        expect(createFrom).toHaveBeenCalledOnce();
        expect(visit).not.toHaveBeenCalled();
    });

    it('copies the sample and opens the copy in the editor', async () => {
        const user = userEvent.setup();
        const { repository } = installMemoryServices();
        renderWithI18n(<EditionsSample />);

        await user.click(useButton());

        await waitFor(() => expect(visit).toHaveBeenCalledOnce());
        const [copy] = await repository.list();
        expect(copy?.name).toBe('Zaterdagclub');
        expect(visit).toHaveBeenCalledExactlyOnceWith({
            method: 'get',
            url: `/nl/editor/${copy?.id ?? ''}`,
        });
    });
});
