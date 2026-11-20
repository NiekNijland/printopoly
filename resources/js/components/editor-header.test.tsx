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

describe('EditorHeader', () => {
    it('links back to Mijn edities and names the edition', () => {
        renderWithI18n(<EditorHeader editionName="Zaterdagclub" />);

        expect(
            screen.getByRole('link', { name: 'Mijn edities' }),
        ).toHaveAttribute('href', '/nl/editions');
        expect(
            screen.getByRole('button', {
                name: 'Instellingen van Zaterdagclub',
            }),
        ).toHaveTextContent('Zaterdagclub');
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
