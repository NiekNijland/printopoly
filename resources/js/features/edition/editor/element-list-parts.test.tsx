import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import {
    ListHeading,
    ListRow,
    OutTag,
    outClass,
    type ListBase,
} from './element-list-parts';

const base = (extra: Partial<ListBase> = {}): ListBase => ({
    edition: sampleEdition(),
    interfaceLanguage: 'nl',
    selected: 'box_lid',
    onSelect: vi.fn(),
    warned: new Set(),
    inSet: undefined,
    ...extra,
});

describe('element list parts', () => {
    it('draws a row with its name, its mark when chosen and its warning, and opens it', async () => {
        const onSelect = vi.fn();
        renderWithI18n(
            <ul>
                <ListRow
                    base={base({ onSelect, warned: new Set(['box_lid']) })}
                    elementKey="box_lid"
                    label="Doos"
                    leading={<span>voor</span>}
                />
            </ul>,
        );
        const row = screen.getByRole('button', { name: /Doos/ });

        expect(row).toHaveAttribute('aria-current', 'true');
        expect(row).toHaveTextContent('voorDoos');
        expect(
            screen.getByLabelText('heeft een waarschuwing'),
        ).toBeInTheDocument();

        await userEvent.click(row);

        expect(onSelect).toHaveBeenCalledWith('box_lid');
    });

    it('fades a part that is not in the set and links it to the print page', () => {
        const out = base({ inSet: new Set(['board']) });
        renderWithI18n(
            <>
                <ListHeading base={out} text="Pionnen" part="pawns" />
                <OutTag base={base()} part="pawns" />
            </>,
        );

        expect(outClass(out, 'pawns')).toContain('opacity-60');
        expect(outClass(base(), 'pawns')).toBe('');
        expect(screen.getAllByRole('link')).toHaveLength(1);
        expect(screen.getByText('Pionnen')).toBeInTheDocument();
    });
});
