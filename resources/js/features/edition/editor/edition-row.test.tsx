import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { resolveEdition } from '@/lib/render/edition-resolve';
import { makeEdition } from '@/testing/edition-test-utils';
import { renderWithI18n } from '@/testing/render';

import { EditionRow, FriendsRow } from './edition-row';

describe('EditionRow', () => {
    it('says what is behind it, with the theme for the ear', () => {
        renderWithI18n(
            <EditionRow
                resolved={resolveEdition(makeEdition({ theme: 'riso' }))}
                interfaceLanguage="nl"
                selected={false}
                onSelect={() => undefined}
            />,
        );

        const row = screen.getByRole('button', {
            name: 'Overzicht: naam, thema, woorden, bordmaat · Riso',
        });
        expect(row).toHaveAttribute('aria-current', 'false');
        expect(row).toHaveAttribute('title', 'Overzicht');
        expect(row).toHaveTextContent('naam, thema, woorden, bordmaat');
        expect(row.querySelector('svg')).not.toBeNull();
    });

    it('marks the chosen row and opens it on a click', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn<() => void>();
        renderWithI18n(
            <EditionRow
                resolved={resolveEdition(makeEdition())}
                interfaceLanguage="nl"
                selected
                onSelect={onSelect}
            />,
        );

        const row = screen.getByRole('button', { name: /Klassiek$/ });
        await user.click(row);

        expect(row).toHaveAttribute('aria-current', 'true');
        expect(onSelect).toHaveBeenCalledTimes(1);
    });
});

describe('FriendsRow', () => {
    it('says how many contributions wait and opens the first', async () => {
        const user = userEvent.setup();
        const onOpen = vi.fn<() => void>();
        renderWithI18n(<FriendsRow count={3} onOpen={onOpen} />);

        const row = screen.getByRole('button', {
            name: 'Van vrienden, 3 wachten. Naar de volgende.',
        });
        expect(row).toHaveTextContent('Van vrienden3');
        await user.click(row);

        expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('speaks of one when one waits', () => {
        renderWithI18n(<FriendsRow count={1} onOpen={() => undefined} />);

        expect(
            screen.getByRole('button', {
                name: 'Van vrienden, 1 wacht. Openen.',
            }),
        ).toBeInTheDocument();
    });
});
