import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import EditionsIndex from '@/pages/editions/index';
import { installMemoryServices } from '@/testing/editions';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

const seed = async (names: string[]) => {
    const services = installMemoryServices();
    for (const name of names) {
        await services.repository.create({
            name,
            language: 'nl',
            theme: 'classic',
            boardProfile: DEFAULT_BOARD_PROFILE,
        });
    }

    return services;
};

describe('EditionsIndex', () => {
    it('heads the page and links to a new edition in the current language', async () => {
        setPage(fakePage({ locale: 'en' }));
        installMemoryServices();

        renderWithI18n(<EditionsIndex />, 'en');

        expect(
            screen.getByRole('heading', { level: 1, name: 'My editions' }),
        ).toBeInTheDocument();
        expect(
            (await screen.findAllByRole('link', { name: 'New edition' }))[0],
        ).toHaveAttribute('href', '/en/editions/new');
    });

    it('says it is loading until the list is read', async () => {
        installMemoryServices();

        renderWithI18n(<EditionsIndex />);

        expect(screen.getByText('Edities laden…')).toBeInTheDocument();
        expect(
            await screen.findByText('Hier komen de edities die je maakt.'),
        ).toBeInTheDocument();
        expect(screen.queryByText('Edities laden…')).not.toBeInTheDocument();
    });

    it('says so when the editions cannot be read from this browser', async () => {
        const { repository } = installMemoryServices();
        vi.spyOn(repository, 'list').mockRejectedValue(new Error('broken'));

        renderWithI18n(<EditionsIndex />);

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Je edities konden niet worden gelezen uit deze browser.',
        );
    });

    it('shows no login banner when Google login is off', async () => {
        setPage(fakePage({ auth: { googleLoginEnabled: false } }));
        await seed(['Zaterdagclub']);

        renderWithI18n(<EditionsIndex />);

        expect(
            await screen.findByRole('heading', { name: 'Zaterdagclub' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Inloggen met Google' }),
        ).not.toBeInTheDocument();
    });

    it('puts the focus on the heading after the last edition is deleted', async () => {
        const user = userEvent.setup();
        await seed(['Enige']);
        renderWithI18n(<EditionsIndex />);

        await user.click(
            await screen.findByRole('button', {
                name: 'Meer opties voor Enige',
            }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Verwijderen' }),
        );
        await user.click(
            await screen.findByRole('button', { name: 'Verwijderen' }),
        );

        expect(await screen.findByText('Editie verwijderd.')).toBeVisible();
        await waitFor(() =>
            expect(
                screen.getByRole('heading', { level: 1, name: 'Mijn edities' }),
            ).toHaveFocus(),
        );
    });
});
