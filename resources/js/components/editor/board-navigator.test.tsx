import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { BoardList, BoardNavigator, gridCell } from './board-navigator';

function Harness({ warned = new Set<string>() }: { warned?: Set<string> }) {
    const [selected, setSelected] = useState('space.01');
    const edition = sampleEdition();

    return (
        <>
            <BoardNavigator
                edition={{
                    ...edition,
                    elements: { 'space.03': { name: 'Het Hok' } },
                }}
                interfaceLanguage="nl"
                selected={selected}
                onSelect={setSelected}
                warned={warned}
            />
            <output data-testid="selected">{selected}</output>
        </>
    );
}

describe('BoardNavigator', () => {
    it('is one tab stop: only the chosen space is focusable', () => {
        renderWithI18n(<Harness />);

        const options = screen.getAllByRole('option');

        expect(options).toHaveLength(41);
        expect(
            options.filter((option) => option.getAttribute('tabindex') === '0'),
        ).toHaveLength(1);
        expect(options.find((o) => o.tabIndex === 0)).toHaveAttribute(
            'aria-selected',
            'true',
        );
    });

    it('walks the spaces in game order with the arrow keys, through the centre, and wraps', async () => {
        const user = userEvent.setup();

        renderWithI18n(<Harness />);
        screen.getByRole('option', { name: /Molenweg/ }).focus();

        await user.keyboard('{ArrowRight}{ArrowDown}');
        expect(screen.getByTestId('selected')).toHaveTextContent('space.03');

        await user.keyboard('{ArrowLeft}{ArrowUp}{ArrowUp}');
        expect(screen.getByTestId('selected')).toHaveTextContent('space.00');

        await user.keyboard('{ArrowLeft}');
        expect(screen.getByTestId('selected')).toHaveTextContent(
            'board_center',
        );

        await user.keyboard('{Home}');
        expect(screen.getByTestId('selected')).toHaveTextContent('space.00');
        await user.keyboard('{End}');
        expect(screen.getByTestId('selected')).toHaveTextContent(
            'board_center',
        );
    });

    it('lets every space and the centre be chosen with the mouse', async () => {
        const user = userEvent.setup();

        renderWithI18n(<Harness />);
        await user.click(screen.getByRole('option', { name: /Midden/ }));

        expect(screen.getByTestId('selected')).toHaveTextContent(
            'board_center',
        );
    });

    it('says in words which spaces are changed or have a warning, never by colour alone', () => {
        renderWithI18n(<Harness warned={new Set(['space.05'])} />);

        expect(
            screen.getByRole('option', { name: 'Het Hok, aangepast' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('option', {
                name: /Station Noord, heeft een waarschuwing/,
            }),
        ).toBeInTheDocument();
    });
});

describe('gridCell', () => {
    it('puts Start bottom right and walks anticlockwise round the board', () => {
        expect(gridCell(0)).toEqual({ row: 10, col: 10 });
        expect(gridCell(10)).toEqual({ row: 10, col: 0 });
        expect(gridCell(20)).toEqual({ row: 0, col: 0 });
        expect(gridCell(30)).toEqual({ row: 0, col: 10 });
        expect(gridCell(39)).toEqual({ row: 9, col: 10 });
    });
});

describe('BoardList', () => {
    it('lists the board per side and picks a space', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();

        renderWithI18n(
            <BoardList
                edition={sampleEdition()}
                interfaceLanguage="nl"
                selected="space.01"
                onSelect={onSelect}
                warned={new Set()}
            />,
        );
        await user.click(screen.getByRole('button', { name: /Veldweg/ }));

        expect(onSelect).toHaveBeenCalledWith('space.03');
        expect(screen.getAllByRole('list').length).toBeGreaterThan(4);
    });
});
