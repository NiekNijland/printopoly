import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer';

const Sheet = ({ direction }: { direction?: 'bottom' | 'right' }) => (
    <Drawer direction={direction}>
        <DrawerTrigger>Vakken</DrawerTrigger>
        <DrawerContent className="mine">
            <DrawerHeader>
                <DrawerTitle>Alle vakken</DrawerTitle>
                <DrawerDescription>Kies een vak</DrawerDescription>
            </DrawerHeader>
        </DrawerContent>
    </Drawer>
);

describe('Drawer', () => {
    it('opens a named dialog from its trigger', async () => {
        const user = userEvent.setup();
        render(<Sheet />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Vakken' }));
        const dialog = await screen.findByRole('dialog', {
            name: 'Alle vakken',
        });

        expect(dialog).toHaveAccessibleDescription('Kies een vak');
        expect(dialog).toHaveAttribute('data-slot', 'drawer-content');
        expect(dialog).toHaveClass('bg-card', 'mine');
        expect(screen.getByText('Alle vakken')).toHaveClass('font-display');
        expect(screen.getByText('Kies een vak')).toHaveClass('text-ink-soft');
    });

    it('comes from the bottom with a handle by default', async () => {
        const user = userEvent.setup();
        render(<Sheet />);

        await user.click(screen.getByRole('button', { name: 'Vakken' }));
        const dialog = await screen.findByRole('dialog');

        expect(dialog).toHaveAttribute('data-vaul-drawer-direction', 'bottom');
        expect(dialog.querySelector('.rounded-full')).not.toBeNull();
    });

    it('comes from the side it is given', async () => {
        const user = userEvent.setup();
        render(<Sheet direction="right" />);

        await user.click(screen.getByRole('button', { name: 'Vakken' }));

        expect(await screen.findByRole('dialog')).toHaveAttribute(
            'data-vaul-drawer-direction',
            'right',
        );
    });
});
