import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

describe('Popover', () => {
    it('opens its content from the trigger and closes with Escape', async () => {
        const user = userEvent.setup();
        render(
            <Popover>
                <PopoverTrigger>Kleur</PopoverTrigger>
                <PopoverContent className="mine">Kies een kleur</PopoverContent>
            </Popover>,
        );

        expect(screen.queryByText('Kies een kleur')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Kleur' }));
        const content = await screen.findByRole('dialog');

        expect(content).toHaveTextContent('Kies een kleur');
        expect(content).toHaveAttribute('data-slot', 'popover-content');
        expect(content).toHaveClass('border-2', 'border-ink', 'mine');
        expect(screen.getByRole('button', { name: 'Kleur' })).toHaveAttribute(
            'aria-expanded',
            'true',
        );

        await user.keyboard('{Escape}');

        await waitFor(() =>
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
        );
    });

    it('is centred under the trigger unless told otherwise', async () => {
        render(
            <Popover defaultOpen>
                <PopoverTrigger>Open</PopoverTrigger>
                <PopoverContent>Tekst</PopoverContent>
            </Popover>,
        );

        expect(await screen.findByRole('dialog')).toHaveAttribute(
            'data-align',
            'center',
        );
    });

    it('takes another alignment', async () => {
        render(
            <Popover defaultOpen>
                <PopoverTrigger>Open</PopoverTrigger>
                <PopoverContent align="start">Tekst</PopoverContent>
            </Popover>,
        );

        expect(await screen.findByRole('dialog')).toHaveAttribute(
            'data-align',
            'start',
        );
    });
});
