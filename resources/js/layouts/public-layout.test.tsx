import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PublicLayout from '@/layouts/public-layout';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { installMemoryServices } from '@/testing/editions';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

const seed = async () => {
    const services = installMemoryServices();
    await services.repository.create({
        name: 'Zaterdagclub',
        language: 'nl',
        theme: 'classic',
        boardProfile: DEFAULT_BOARD_PROFILE,
    });

    return services;
};

describe('PublicLayout', () => {
    it('puts the page in a focusable main after a skip link, between header and footer', () => {
        renderWithI18n(
            <PublicLayout>
                <h1>Welkom</h1>
            </PublicLayout>,
        );
        const main = screen.getByRole('main');

        expect(
            screen.getByRole('link', { name: 'Naar de inhoud' }),
        ).toHaveAttribute('href', '#content');
        expect(main).toHaveAttribute('id', 'content');
        expect(main).toHaveAttribute('tabindex', '-1');
        expect(main).toContainElement(
            screen.getByRole('heading', { name: 'Welkom' }),
        );
        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(screen.getByRole('contentinfo')).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows a flashed error as an alert', () => {
        setPage(fakePage({ flash: { error: 'Inloggen is mislukt.' } }));

        renderWithI18n(<PublicLayout>Inhoud</PublicLayout>);

        expect(screen.getByRole('alert')).toHaveTextContent(
            'Inloggen is mislukt.',
        );
    });

    it('wipes the editions in this browser when the server asks for it after a logout', async () => {
        const services = await seed();
        setPage(fakePage({ clearLocalCopy: true }));

        renderWithI18n(<PublicLayout>Inhoud</PublicLayout>);

        await waitFor(async () =>
            expect(await services.repository.list()).toHaveLength(0),
        );
    });

    it('keeps the editions without that request', async () => {
        const services = await seed();
        setPage(fakePage());

        renderWithI18n(<PublicLayout>Inhoud</PublicLayout>);

        expect(await screen.findByText('Inhoud')).toBeInTheDocument();
        expect(await services.repository.list()).toHaveLength(1);
    });
});
