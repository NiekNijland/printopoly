import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import EditorShow from '@/pages/editor/show';
import { installMemoryServices } from '@/testing/editions';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

describe('EditorShow', () => {
    it('says it is loading, then opens the edition in the editor', async () => {
        const { repository } = installMemoryServices();
        const edition = await repository.create({
            name: 'Zaterdagclub',
            language: 'nl',
            theme: 'classic',
            boardProfile: DEFAULT_BOARD_PROFILE,
        });

        renderWithI18n(<EditorShow editionId={edition.id} />);

        expect(screen.getByRole('status')).toHaveTextContent('Edities laden…');
        expect(
            await screen.findByRole('button', {
                name: 'Menu van Zaterdagclub',
            }),
        ).toBeInTheDocument();
        expect(screen.queryByText('Edities laden…')).not.toBeInTheDocument();
    });

    it('explains that an edition is not in this browser and links back', async () => {
        setPage(fakePage({ locale: 'en' }));
        installMemoryServices();

        renderWithI18n(<EditorShow editionId="gone" />, 'en');

        expect(
            await screen.findByRole('heading', {
                level: 1,
                name: "This edition isn't in this browser",
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'My editions' }),
        ).toHaveAttribute('href', '/en/editions');
    });

    it('shows the missing message in Dutch with its explanation', async () => {
        installMemoryServices();

        renderWithI18n(<EditorShow editionId="gone" />);

        expect(
            await screen.findByRole('heading', {
                name: 'Deze editie staat niet in deze browser',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                'Misschien is hij verwijderd, of staat hij op een andere computer.',
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Mijn edities' }),
        ).toHaveAttribute('href', '/nl/editions');
    });

    it('says the edition could not be opened when reading fails', async () => {
        const { repository } = installMemoryServices();
        vi.spyOn(repository, 'open').mockRejectedValue(new Error('broken'));

        renderWithI18n(<EditorShow editionId="any" />);

        expect(
            await screen.findByRole('heading', {
                name: 'De editie kon niet worden geopend',
            }),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(/Misschien is hij verwijderd/),
        ).not.toBeInTheDocument();
    });
});
