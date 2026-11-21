import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import {
    BoardList,
    BoardNavigator,
    gridCell,
    gridTemplate,
} from './board-navigator';

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

describe('swapping spaces from the keyboard', () => {
    function Swappable({
        onSwap,
    }: {
        onSwap: (from: string, to: string) => void;
    }) {
        const [selected, setSelected] = useState('space.01');

        return (
            <BoardNavigator
                edition={sampleEdition()}
                interfaceLanguage="nl"
                selected={selected}
                onSelect={setSelected}
                warned={new Set()}
                onSwap={onSwap}
            />
        );
    }

    it('picks a target of the same kind with W and the arrows, confirms with Enter and says what stays', async () => {
        const user = userEvent.setup();
        const onSwap = vi.fn();

        renderWithI18n(<Swappable onSwap={onSwap} />);
        screen.getByRole('option', { name: /Molenweg/ }).focus();

        await user.keyboard('w');
        expect(screen.getByRole('status')).toHaveTextContent('Enter bevestigt');
        // The first target after Molenweg is the next street, never the Community Chest space between.
        await user.keyboard('{Enter}');

        expect(onSwap).toHaveBeenCalledWith('space.01', 'space.03');
        expect(screen.getByRole('status')).toHaveTextContent(
            'Prijs en kleur horen bij de plek',
        );
    });

    it('cancels with Escape and swaps nothing', async () => {
        const user = userEvent.setup();
        const onSwap = vi.fn();

        renderWithI18n(<Swappable onSwap={onSwap} />);
        screen.getByRole('option', { name: /Molenweg/ }).focus();

        await user.keyboard('w{ArrowRight}{Escape}');
        await user.keyboard('{Enter}');

        expect(onSwap).not.toHaveBeenCalled();
        expect(screen.getByRole('status')).toHaveTextContent('geannuleerd');
    });

    it('has no button under the board, and refuses a space that cannot swap', async () => {
        const user = userEvent.setup();

        // "Wisselen met…" lives in the menu of the field panel (B141); dragging and W stay.
        renderWithI18n(<Swappable onSwap={vi.fn()} />);
        expect(
            screen.queryByRole('button', { name: 'Wisselen met…' }),
        ).toBeNull();

        await user.click(screen.getByRole('option', { name: /Start/ }));
        await user.keyboard('w');
        expect(
            screen.getByText(/Wisselen kan alleen tussen straten/),
        ).toBeInTheDocument();
    });
});

describe('board proportions', () => {
    it('gives corners and spaces the sizes of the board profile, also for another board size', () => {
        expect(gridTemplate(DEFAULT_BOARD_PROFILE)).toBe(
            '70fr repeat(9, 40fr) 70fr',
        );
        expect(
            gridTemplate({ ...DEFAULT_BOARD_PROFILE, outer: 400, corner: 50 }),
        ).toBe('50fr repeat(9, 33.333333333333336fr) 50fr');

        const edition = sampleEdition();

        renderWithI18n(
            <BoardNavigator
                edition={{
                    ...edition,
                    boardProfile: {
                        ...DEFAULT_BOARD_PROFILE,
                        outer: 400,
                        corner: 50,
                    },
                }}
                interfaceLanguage="nl"
                selected="space.01"
                onSelect={() => undefined}
                warned={new Set()}
            />,
        );

        expect(screen.getByRole('listbox').style.gridTemplateColumns).toContain(
            '50fr',
        );
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

    it('starts with the centre of the board, so the logo and photo are found from the list (UX 9)', async () => {
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
        const rows = screen.getAllByRole('button');
        expect(rows[0]).toHaveAccessibleName(/^Midden van het bord/);

        await user.click(rows[0]!);
        expect(onSelect).toHaveBeenCalledWith('board_center');
    });
});
