import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { renderWithI18n } from '@/testing/render';

const Palette = ({ onSelect }: { onSelect?: (value: string) => void }) => (
    <Command label="Vakken" className="mine">
        <CommandInput placeholder="Zoek een vak" />
        <CommandList>
            <CommandEmpty>Niets gevonden</CommandEmpty>
            <CommandGroup heading="Straten">
                <CommandItem onSelect={onSelect}>Dorpsstraat</CommandItem>
                <CommandItem onSelect={onSelect}>Kalverstraat</CommandItem>
            </CommandGroup>
        </CommandList>
    </Command>
);

describe('Command', () => {
    beforeEach(() => {
        Element.prototype.scrollIntoView = vi.fn<() => void>();
    });

    it('filters the items as the user types', async () => {
        const user = userEvent.setup();
        render(<Palette />);

        expect(screen.getAllByRole('option')).toHaveLength(2);
        expect(screen.getByText('Straten')).toBeInTheDocument();

        await user.type(screen.getByPlaceholderText('Zoek een vak'), 'kalver');

        expect(screen.getAllByRole('option')).toHaveLength(1);
        expect(
            screen.getByRole('option', { name: 'Kalverstraat' }),
        ).toBeInTheDocument();
    });

    it('shows the empty text when nothing matches', async () => {
        const user = userEvent.setup();
        render(<Palette />);

        await user.type(screen.getByPlaceholderText('Zoek een vak'), 'xyz');

        expect(screen.queryAllByRole('option')).toHaveLength(0);
        expect(screen.getByText('Niets gevonden')).toBeInTheDocument();
    });

    it('chooses an item with the keyboard', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn<(value: string) => void>();
        render(<Palette onSelect={onSelect} />);

        await user.click(screen.getByPlaceholderText('Zoek een vak'));
        await user.keyboard('{ArrowDown}{Enter}');

        expect(onSelect).toHaveBeenCalledExactlyOnceWith('Kalverstraat');
        expect(
            screen.getByRole('option', { name: 'Kalverstraat' }),
        ).toHaveAttribute('data-selected', 'true');
    });

    it('keeps its own classes on the root, input and list', () => {
        const { container } = render(<Palette />);

        expect(container.querySelector('[data-slot="command"]')).toHaveClass(
            'bg-popover',
            'mine',
        );
        expect(
            container.querySelector('[data-slot="command-input-wrapper"] svg'),
        ).not.toBeNull();
        expect(screen.getByRole('listbox')).toHaveClass('max-h-[300px]');
    });
});

describe('CommandDialog', () => {
    beforeEach(() => {
        Element.prototype.scrollIntoView = vi.fn<() => void>();
    });

    it('names the dialog with the default title and description', async () => {
        renderWithI18n(
            <CommandDialog open>
                <CommandInput placeholder="Zoek" />
            </CommandDialog>,
        );
        const dialog = await screen.findByRole('dialog', {
            name: 'Command Palette',
        });

        expect(dialog).toHaveAccessibleDescription(
            'Search for a command to run...',
        );
        expect(screen.getByPlaceholderText('Zoek')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /sluiten|close/i }),
        ).toBeInTheDocument();
    });

    it('takes its own title and can hide the close button', async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn<(open: boolean) => void>();
        renderWithI18n(
            <CommandDialog
                open
                title="Ga naar"
                description="Kies een vak"
                showCloseButton={false}
                onOpenChange={onOpenChange}
            >
                <CommandInput placeholder="Zoek" />
            </CommandDialog>,
        );

        expect(
            await screen.findByRole('dialog', { name: 'Ga naar' }),
        ).toHaveAccessibleDescription('Kies een vak');
        expect(
            screen.queryByRole('button', { name: /sluiten|close/i }),
        ).not.toBeInTheDocument();

        await user.keyboard('{Escape}');

        await waitFor(() =>
            expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false),
        );
    });
});
