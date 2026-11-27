import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { ChoiceLine } from './choice-line';

const Harness = ({ initiallyOpen = false }: { initiallyOpen?: boolean }) => {
    const [open, setOpen] = useState(initiallyOpen);

    return (
        <ChoiceLine
            title="Thema"
            summary="Klassiek"
            open={open}
            onToggle={() => setOpen((value) => !value)}
            changeLabel="Wijzigen"
            collapseLabel="Inklappen"
        >
            <button type="button">Riso</button>
        </ChoiceLine>
    );
};

describe('ChoiceLine', () => {
    it('says the choice in one line while it is closed', () => {
        render(<Harness />);

        const trigger = screen.getByRole('button', {
            name: 'Thema Klassiek Wijzigen',
        });
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('button', { name: 'Riso' })).toBeNull();
    });

    it('opens to show the choices and closes again', async () => {
        const user = userEvent.setup();
        render(<Harness />);

        await user.click(screen.getByRole('button', { name: /Wijzigen/ }));

        expect(screen.getByRole('button', { name: 'Riso' })).toBeVisible();
        const trigger = screen.getByRole('button', { name: /Inklappen/ });
        expect(trigger).toHaveAttribute('aria-expanded', 'true');

        await user.click(trigger);

        expect(screen.queryByRole('button', { name: 'Riso' })).toBeNull();
        expect(screen.getByRole('button', { name: /Wijzigen/ })).toBeVisible();
    });

    it('starts open when the choice is open', () => {
        render(<Harness initiallyOpen />);

        expect(screen.getByRole('button', { name: 'Riso' })).toBeVisible();
    });
});
