import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Menu = ({ onDelete }: { onDelete?: () => void }) => (
    <DropdownMenu>
        <DropdownMenuTrigger>Meer</DropdownMenuTrigger>
        <DropdownMenuContent className="mine">
            <DropdownMenuLabel inset>Editie</DropdownMenuLabel>
            <DropdownMenuItem>
                Kopiëren
                <DropdownMenuShortcut>Ctrl+C</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                Weggooien
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Uit</DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
);

describe('DropdownMenu', () => {
    it('opens a menu at the end of its trigger', async () => {
        const user = userEvent.setup();
        render(<Menu />);

        expect(screen.queryByRole('menu')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Meer' }));
        const menu = await screen.findByRole('menu');

        expect(menu).toHaveAttribute('data-align', 'end');
        expect(menu).toHaveClass('border-2', 'border-ink', 'mine');
        expect(screen.getAllByRole('menuitem')).toHaveLength(3);
        expect(screen.getByRole('separator')).toHaveClass('bg-line');
        expect(screen.getByText('Ctrl+C')).toHaveClass('ml-auto');
        expect(screen.getByText('Editie')).toHaveAttribute(
            'data-inset',
            'true',
        );
    });

    it('runs the chosen item and closes', async () => {
        const user = userEvent.setup();
        const onDelete = vi.fn<() => void>();
        render(<Menu onDelete={onDelete} />);

        await user.click(screen.getByRole('button', { name: 'Meer' }));
        const item = await screen.findByRole('menuitem', { name: 'Weggooien' });

        expect(item).toHaveAttribute('data-variant', 'destructive');
        expect(item).toHaveClass('data-[variant=destructive]:text-press');

        await user.click(item);

        expect(onDelete).toHaveBeenCalledOnce();
        await waitFor(() =>
            expect(screen.queryByRole('menu')).not.toBeInTheDocument(),
        );
    });

    it('marks a plain item as default and a disabled one as such', async () => {
        const user = userEvent.setup();
        render(<Menu />);

        await user.click(screen.getByRole('button', { name: 'Meer' }));

        expect(
            await screen.findByRole('menuitem', { name: /Kopiëren/ }),
        ).toHaveAttribute('data-variant', 'default');
        expect(screen.getByRole('menuitem', { name: 'Uit' })).toHaveAttribute(
            'aria-disabled',
            'true',
        );
    });

    it('takes another alignment', async () => {
        render(
            <DropdownMenu defaultOpen>
                <DropdownMenuTrigger>Meer</DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuItem>Een</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>,
        );

        expect(await screen.findByRole('menu')).toHaveAttribute(
            'data-align',
            'start',
        );
    });
});
