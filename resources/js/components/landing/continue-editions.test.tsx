import type * as InertiaReact from '@inertiajs/react';
import { screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';

import { ContinueEditions } from '@/components/landing/continue-editions';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import { installMemoryServices } from '@/testing/editions';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () => fakePage(),
}));

const input = {
    theme: 'classic' as const,
    language: 'nl' as const,
    currency: 'eur' as const,
    boardProfile: DEFAULT_BOARD_PROFILE,
};

describe('ContinueEditions', () => {
    it('renders nothing on the server', () => {
        installMemoryServices();

        expect(renderToString(<ContinueEditions />)).toBe('');
    });

    it('renders nothing without editions', async () => {
        installMemoryServices();
        const { container } = renderWithI18n(<ContinueEditions />);

        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(container).toBeEmptyDOMElement();
    });

    it('links the most recent editions and Mijn edities', async () => {
        const { repository } = installMemoryServices();
        await repository.create({ ...input, name: 'Oude editie' });
        await repository.create({ ...input, name: 'Nieuwste editie' });
        renderWithI18n(<ContinueEditions />);

        expect(
            await screen.findByRole('link', { name: 'Nieuwste editie' }),
        ).toHaveAttribute('href', expect.stringContaining('/nl/editor/'));
        expect(
            screen.getByRole('link', { name: 'Alle edities in Mijn edities' }),
        ).toHaveAttribute('href', '/nl/editions');
        expect(screen.getByText('Verder met')).toBeInTheDocument();
        // A label, so the h1 of the landing stays the first heading (UX 8).
        expect(screen.queryByRole('heading')).toBeNull();
    });
});
