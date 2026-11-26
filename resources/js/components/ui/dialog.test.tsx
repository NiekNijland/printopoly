import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { renderWithI18n } from '@/testing/render';

import { Button } from './button';
import { Dialog, DialogContent, DialogTitle } from './dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './dropdown-menu';

const MenuWithDialog = () => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <Button>Menu</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setOpen(true)}>
                        Sneltoetsen
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogTitle>Sneltoetsen</DialogTitle>
                </DialogContent>
            </Dialog>
        </>
    );
};

describe('DialogContent focus (bug 16, ronde 3)', () => {
    it('gives the focus back to the menu button after Escape, not to body', async () => {
        const user = userEvent.setup();
        renderWithI18n(<MenuWithDialog />);

        await user.click(screen.getByRole('button', { name: 'Menu' }));
        await user.click(
            await screen.findByRole('menuitem', { name: 'Sneltoetsen' }),
        );
        expect(await screen.findByRole('dialog')).toBeInTheDocument();

        await user.keyboard('{Escape}');

        await waitFor(() =>
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
        );
        expect(document.activeElement).toBe(
            screen.getByRole('button', { name: 'Menu' }),
        );
    });
});
