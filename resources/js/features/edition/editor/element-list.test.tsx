import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { ElementList } from './element-list';

describe('ElementList', () => {
    it('makes "niet in je set" a link to the row of the part on the print page (Kees)', () => {
        const edition = sampleEdition();

        renderWithI18n(
            <ElementList
                tab="box"
                edition={edition}
                interfaceLanguage="nl"
                selected="box_lid"
                onSelect={() => undefined}
                warned={new Set()}
                inSet={new Set(['board', 'cards', 'deeds'])}
            />,
        );

        const pawns = document.querySelector('a[data-not-in-set="pawns"]');
        const lid = document.querySelector('a[data-not-in-set="boxLid"]');
        expect(pawns?.getAttribute('href')).toBe(
            `/nl/editions/${edition.id}/print?part=tokens`,
        );
        expect(lid?.getAttribute('href')).toContain('part=box_lid');
        // Not inside the button that opens the element.
        expect(lid?.closest('button')).toBeNull();
        expect(
            screen.getAllByRole('link', {
                name: 'Niet in je set. Zet het erin op de printpagina.',
            }).length,
        ).toBeGreaterThan(0);
    });

    it('lists the notes with their colour, marks a warning and a change, and opens one', async () => {
        const onSelect = vi.fn();
        const edition = {
            ...sampleEdition({ parts: { money: true } }),
            elements: { 'note.100': { color: '#123456' } },
        };
        renderWithI18n(
            <ElementList
                tab="money"
                edition={edition}
                interfaceLanguage="nl"
                selected="note.1"
                onSelect={onSelect}
                warned={new Set(['note.100'])}
                inSet={new Set(['money'])}
            />,
        );
        const hundred = screen.getByRole('button', { name: /100/ });

        expect(hundred.querySelector('span')).toHaveStyle({
            background: '#123456',
        });
        expect(hundred.querySelector('[aria-label]')).not.toBeNull();
        expect(screen.queryByText('Speelgeld')).not.toBeInTheDocument();

        await userEvent.click(hundred);

        expect(onSelect).toHaveBeenCalledWith('note.100');
    });
});
