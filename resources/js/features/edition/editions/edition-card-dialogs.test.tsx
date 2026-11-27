import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithI18n } from '@/testing/render';

import { DeleteDialog, RenameDialog } from './edition-card-dialogs';

describe('RenameDialog', () => {
    it('selects the name, and saves only a name that is not empty', async () => {
        const user = userEvent.setup();
        const onRename = vi.fn();
        const onNameChange = vi.fn<(name: string) => void>();
        const { unmount } = renderWithI18n(
            <RenameDialog
                open
                onOpenChange={vi.fn()}
                name="Club"
                onNameChange={onNameChange}
                failed={false}
                busy={false}
                onRename={onRename}
            />,
        );

        const field = screen.getByLabelText('Naam');
        expect(field).toHaveFocus();
        await user.type(field, 'x');
        expect(onNameChange).toHaveBeenLastCalledWith('Clubx');
        await user.click(screen.getByRole('button', { name: 'Opslaan' }));
        expect(onRename).toHaveBeenCalledTimes(1);
        unmount();

        renderWithI18n(
            <RenameDialog
                open
                onOpenChange={vi.fn()}
                name=" "
                onNameChange={onNameChange}
                failed
                busy={false}
                onRename={onRename}
            />,
        );
        expect(screen.getByRole('button', { name: 'Opslaan' })).toBeDisabled();
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Dat is niet gelukt.',
        );
    });
});

describe('DeleteDialog', () => {
    it('warns that an edition in the account is gone everywhere', async () => {
        const user = userEvent.setup();
        const onDelete = vi.fn();
        renderWithI18n(
            <DeleteDialog
                open
                onOpenChange={vi.fn()}
                name="Club"
                inAccount
                failed={false}
                busy={false}
                onDelete={onDelete}
            />,
        );

        expect(
            screen.getByRole('dialog', { name: 'Club verwijderen?' }),
        ).toHaveAccessibleDescription(/overal weg/);
        await user.click(screen.getByRole('button', { name: 'Verwijderen' }));
        expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('says when only this browser has it, and blocks while busy', () => {
        renderWithI18n(
            <DeleteDialog
                open
                onOpenChange={vi.fn()}
                name="Club"
                inAccount={false}
                failed
                busy
                onDelete={vi.fn()}
            />,
        );

        expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
            /alleen in deze browser/,
        );
        expect(
            screen.getByRole('button', { name: 'Verwijderen' }),
        ).toBeDisabled();
        expect(screen.getByRole('alert')).toBeInTheDocument();
    });
});
