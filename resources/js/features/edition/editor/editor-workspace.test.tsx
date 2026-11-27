import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { openWorkspace } from '@/features/edition/testing/workspace';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

import { EditorWorkspace } from './editor-workspace';

const first = (items: HTMLElement[]): HTMLElement => {
    const [item] = items;
    if (item === undefined) {
        throw new Error('Nothing found');
    }

    return item;
};

beforeEach(() => {
    setPage(fakePage({ auth: { googleLoginEnabled: true } }));
});

describe('EditorWorkspace', () => {
    it('shows the compact header, the save status with the login prompt, and the first space', async () => {
        const { session } = await openWorkspace();

        renderWithI18n(<EditorWorkspace session={session} />);

        expect(
            screen.getByRole('button', { name: 'Menu van Zaterdagclub' }),
        ).toBeInTheDocument();
        expect(
            screen.getAllByRole('link', { name: 'Inloggen met Google' })[0],
        ).toBeInTheDocument();
        // No Controle and no counter while you work (B197).
        expect(
            screen.queryByRole('button', { name: /Controle/ }),
        ).not.toBeInTheDocument();
        expect(
            screen.getAllByRole('link', { name: 'Printen' })[0],
        ).toHaveAttribute('href', '/nl/editions/sample-edition-1/print');
        expect(
            screen.getByRole('heading', { name: 'Molenweg' }),
        ).toBeInTheDocument();
    });

    it('edits a name, undoes and redoes it', async () => {
        const user = userEvent.setup();
        const { session } = await openWorkspace();

        renderWithI18n(<EditorWorkspace session={session} />);
        const name = screen.getByLabelText('Naam');
        await user.clear(name);
        await user.type(name, 'Het Hok');

        expect(session.edition.elements['space.01']?.name).toBe('Het Hok');
        const undo = first(
            screen.getAllByRole('button', { name: 'Ongedaan maken' }),
        );
        expect(undo).toBeEnabled();

        await user.click(undo);
        expect(session.edition.elements['space.01']?.name).not.toBe('Het Hok');
        await user.click(
            first(screen.getAllByRole('button', { name: 'Opnieuw' })),
        );
        expect(session.edition.elements['space.01']?.name).toBe('Het Hok');
    });

    it('has no settings or words dialog, no Stijl tab and no links to them any more (B145)', async () => {
        const { session } = await openWorkspace();

        renderWithI18n(<EditorWorkspace session={session} />);

        expect(
            screen.queryByRole('button', {
                name: 'Onderdelen kiezen of overslaan',
            }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Woorden van je editie' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('tab', { name: /Stijl/ }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByText('Maak je editie samen'),
        ).not.toBeInTheDocument();
    });
});
