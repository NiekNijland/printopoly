import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { describe, expect, it } from 'vitest';

import { useDisclosure } from './use-disclosure';

const Menu = () => {
    const ref = useRef<HTMLDivElement>(null);
    const { open, toggle, close } = useDisclosure(ref);

    return (
        <>
            <div ref={ref}>
                <button type="button" onClick={toggle}>
                    Menu
                </button>
                {open && (
                    <div role="menu">
                        <button type="button">Inside</button>
                        <button type="button" onClick={close}>
                            Close
                        </button>
                    </div>
                )}
            </div>
            <button type="button">Outside</button>
        </>
    );
};

describe('useDisclosure', () => {
    it('starts closed and toggles open and shut', async () => {
        const user = userEvent.setup();
        render(<Menu />);

        expect(screen.queryByRole('menu')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Menu' }));
        expect(screen.getByRole('menu')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Menu' }));
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('closes with close()', async () => {
        const user = userEvent.setup();
        render(<Menu />);

        await user.click(screen.getByRole('button', { name: 'Menu' }));
        await user.click(screen.getByRole('button', { name: 'Close' }));

        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('closes on Escape but not on another key', async () => {
        const user = userEvent.setup();
        render(<Menu />);

        await user.click(screen.getByRole('button', { name: 'Menu' }));
        await user.keyboard('a');
        expect(screen.getByRole('menu')).toBeInTheDocument();

        await user.keyboard('{Escape}');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('stays open on a click inside and closes on a click outside', async () => {
        const user = userEvent.setup();
        render(<Menu />);

        await user.click(screen.getByRole('button', { name: 'Menu' }));
        await user.click(screen.getByRole('button', { name: 'Inside' }));
        expect(screen.getByRole('menu')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Outside' }));
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
});
