import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithI18n } from '@/testing/render';

import { ShortcutsDialog } from './shortcuts-dialog';

const open = (tabNames?: readonly string[], plain = false) => {
    const onPlainChange = vi.fn();
    const onOpenChange = vi.fn();
    renderWithI18n(
        <ShortcutsDialog
            open
            onOpenChange={onOpenChange}
            plain={plain}
            onPlainChange={onPlainChange}
            tabNames={tabNames}
        />,
    );

    return { onPlainChange, onOpenChange };
};

const rowOf = (text: string): HTMLElement =>
    screen.getByText(text).parentElement ?? document.body;

describe('ShortcutsDialog', () => {
    it('lists the shortcuts per group with their keys', () => {
        open();

        expect(
            screen.getByRole('heading', { name: 'Navigeren' }),
        ).toBeInTheDocument();
        expect(
            within(rowOf('Ongedaan maken')).getByText('Z'),
        ).toBeInTheDocument();
    });

    it('names the tabs the edition has, and their number keys', () => {
        open(['Bord', 'Kaarten', 'Doos']);
        const row = rowOf('Naar Bord, Kaarten of Doos');

        expect(within(row).getAllByText('1…3')).toHaveLength(2);
        expect(within(row).getByText('Alt')).toBeInTheDocument();
        expect(within(row).getByText('of')).toBeInTheDocument();
    });

    it('names a single tab and its one key', () => {
        open(['Bord']);

        expect(within(rowOf('Naar Bord')).getAllByText('1')).toHaveLength(2);
    });

    it('switches the single-letter shortcuts and closes with Klaar', async () => {
        const { onPlainChange, onOpenChange } = open(undefined, true);

        await userEvent.click(screen.getByRole('switch'));
        await userEvent.click(screen.getByRole('button', { name: 'Klaar' }));

        expect(onPlainChange).toHaveBeenCalledWith(false);
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
