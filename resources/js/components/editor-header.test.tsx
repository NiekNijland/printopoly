import type * as InertiaReact from '@inertiajs/react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditorHeader } from '@/components/editor-header';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () => fakePage(),
}));

describe('EditorHeader long names (bug 24, ronde 3)', () => {
    it('shows a long name smaller and on two lines instead of cutting it', () => {
        const name =
            'Familiespel van Oma Ria en Opa Henk uit Lutten aan de Vecht';
        renderWithI18n(<EditorHeader editionName={name} />);
        const shown = document.querySelector('[data-edition-name]');

        expect(shown).toHaveTextContent(name);
        expect(shown).toHaveClass('line-clamp-2', 'text-sm');
        expect(shown).not.toHaveClass('truncate');
    });
});

describe('EditorHeader', () => {
    it('links back to Mijn edities and names the edition', () => {
        renderWithI18n(<EditorHeader editionName="Zaterdagclub" />);

        expect(
            screen.getByRole('link', { name: 'Mijn edities' }),
        ).toHaveAttribute('href', '/nl/editions');
        expect(
            screen.getByRole('button', { name: 'Menu van Zaterdagclub' }),
        ).toHaveTextContent('Zaterdagclub');
    });

    it('opens the name menu with the actions on the whole edition (B144)', async () => {
        const user = userEvent.setup();
        const menu = {
            onSettings: vi.fn(),
            onCollect: vi.fn(),
            collectCount: 3,
            onShortcuts: vi.fn(),
            onDuplicate: vi.fn(),
        };

        renderWithI18n(<EditorHeader editionName="Zaterdagclub" menu={menu} />);
        const name = screen.getByRole('button', {
            name: 'Menu van Zaterdagclub, er wachten bijdragen van vrienden',
        });
        expect(name.querySelector('[data-waiting-dot]')).not.toBeNull();

        await user.click(name);
        const items = await screen.findAllByRole('menuitem');
        expect(items.map((item) => item.textContent)).toEqual([
            'Editie-instellingenE',
            'Samen maken3 nieuw',
            'Sneltoetsen?',
            'Dupliceren',
            'Naar Mijn edities',
        ]);

        await user.click(screen.getByRole('menuitem', { name: /Samen maken/ }));
        expect(menu.onCollect).toHaveBeenCalledOnce();
    });

    it('keeps the header to one line: no Samen maken or Sneltoetsen buttons (B144)', () => {
        renderWithI18n(
            <EditorHeader
                editionName="Zaterdagclub"
                onOpenPreview={() => undefined}
                menu={{
                    onCollect: () => undefined,
                    onShortcuts: () => undefined,
                }}
            />,
        );

        expect(
            screen.queryByRole('button', { name: /Samen maken/ }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Sneltoetsen' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Voorbeeld' }),
        ).toBeInTheDocument();
    });

    it('makes way for the bar of an element on a phone', () => {
        renderWithI18n(
            <EditorHeader
                editionName="Zaterdagclub"
                phoneBar={<p>Molenweg</p>}
            />,
        );

        expect(screen.getByText('Molenweg')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Printopoly' }).parentElement,
        ).toHaveClass('hidden', 'lg:flex');
    });

    it('links the logo mark to the homepage', () => {
        renderWithI18n(<EditorHeader editionName="Zaterdagclub" />);

        expect(
            screen.getByRole('link', { name: 'Printopoly' }),
        ).toHaveAttribute('href', '/nl');
    });

    it('disables undo and redo until there is something to undo', () => {
        renderWithI18n(<EditorHeader editionName="Zaterdagclub" />);

        expect(
            screen.getByRole('button', { name: 'Ongedaan maken' }),
        ).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Opnieuw' })).toBeDisabled();
    });

    it('shows Controle with the number of warnings', async () => {
        const onToggleCheck = vi.fn();

        renderWithI18n(
            <EditorHeader
                editionName="Zaterdagclub"
                checkCount={2}
                onToggleCheck={onToggleCheck}
            />,
        );

        await userEvent.click(
            screen.getByRole('button', { name: 'Controle: 2' }),
        );

        expect(onToggleCheck).toHaveBeenCalledOnce();
    });

    it('shows Controle with 0 when nothing was found and hides Printen without a print page', () => {
        renderWithI18n(<EditorHeader editionName="Zaterdagclub" />);

        expect(
            screen.getByRole('button', { name: 'Controle: 0' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Printen' }),
        ).not.toBeInTheDocument();
    });

    it('links Printen as the primary action', () => {
        renderWithI18n(
            <EditorHeader editionName="Zaterdagclub" printHref="/nl/print" />,
        );

        expect(screen.getByRole('link', { name: 'Printen' })).toHaveClass(
            'bg-press',
        );
    });
});
