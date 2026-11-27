import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';

const Details = ({ defaultOpen = false }: { defaultOpen?: boolean }) => (
    <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger>More rules</CollapsibleTrigger>
        <CollapsibleContent>Double rent on a full set.</CollapsibleContent>
    </Collapsible>
);

describe('Collapsible', () => {
    it('hides its content until the trigger is clicked', async () => {
        const user = userEvent.setup();
        render(<Details />);
        const trigger = screen.getByRole('button', { name: 'More rules' });

        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(trigger).toHaveAttribute('data-slot', 'collapsible-trigger');
        expect(
            screen.queryByText('Double rent on a full set.'),
        ).not.toBeInTheDocument();

        await user.click(trigger);

        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Double rent on a full set.')).toHaveAttribute(
            'data-slot',
            'collapsible-content',
        );
    });

    it('starts open when asked and closes again with the keyboard', async () => {
        const user = userEvent.setup();
        const { container } = render(<Details defaultOpen />);
        const trigger = screen.getByRole('button', { name: 'More rules' });

        expect(screen.getByText('Double rent on a full set.')).toBeVisible();
        expect(
            container.querySelector('[data-slot="collapsible"]'),
        ).toHaveAttribute('data-state', 'open');

        trigger.focus();
        await user.keyboard('{Enter}');

        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(
            container.querySelector('[data-slot="collapsible"]'),
        ).toHaveAttribute('data-state', 'closed');
    });
});
