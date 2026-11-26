import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { gridTemplate } from './board-grid';
import { BoardNavigator } from './board-navigator';

const Harness = ({ warned = new Set<string>() }: { warned?: Set<string> }) => {
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
};

describe('BoardNavigator', () => {
    it('keeps its colours in high contrast (bug 14)', () => {
        renderWithI18n(<Harness />);

        expect(
            screen.getByRole('listbox').closest('[data-keep-colors]'),
        ).not.toBeNull();
    });

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
    const Swappable = ({
        onSwap,
    }: {
        onSwap: (from: string, to: string) => void;
    }) => {
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
    };

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

describe('board names (bug 24 and UX 2, ronde 3)', () => {
    it('draws the real centre, so a long name breaks as in the preview and the PDF (bug 37, ronde 4)', () => {
        const edition = {
            ...sampleEdition(),
            name: 'Familiespel van Oma Ria en Opa Henk',
        };
        renderWithI18n(
            <BoardNavigator
                edition={edition}
                interfaceLanguage="nl"
                selected="space.01"
                onSelect={() => undefined}
                warned={new Set()}
            />,
        );
        const centre = screen.getByTestId('mini-center');

        // The same renderer as the preview and the print: the ribbon with the name, the card spots, the colour.
        expect(
            centre.querySelector('[data-element="board-center"]'),
        ).not.toBeNull();
        expect(
            centre.querySelector('[data-slot="edition-name"]'),
        ).toHaveTextContent('Familiespel van Oma Ria en Opa Henk');
        expect(
            centre.querySelector('[data-slot="card-spot-chance"]'),
        ).not.toBeNull();
    });

    it('lays bare hit areas over the board it is given, in the grid of the profile with its rim (feedback 22 nov)', () => {
        const edition = {
            ...sampleEdition(),
            boardProfile: { ...DEFAULT_BOARD_PROFILE, border: 5 },
        };
        renderWithI18n(
            <BoardNavigator
                overlay
                board={<div data-testid="printed-board" />}
                edition={edition}
                interfaceLanguage="nl"
                selected="space.01"
                onSelect={() => undefined}
                warned={new Set(['space.03'])}
                photos={new Map()}
            />,
        );
        const grid = screen.getByRole('listbox');

        expect(screen.getByTestId('printed-board')).toBeInTheDocument();
        // No gap and no frame of its own, so the cells lie on the drawn spaces; the rim is padding.
        expect(grid).not.toHaveClass('gap-px');
        expect(grid).not.toHaveClass('border-2');
        expect(grid.style.padding).toBe('1%');
        expect(grid.style.gridTemplateColumns).toBe(
            gridTemplate(edition.boardProfile),
        );
        // The cells draw no names, colours or centre of their own: the board under them shows those.
        const molenweg = screen.getByRole('option', { name: 'Molenweg' });
        expect(molenweg).toHaveTextContent('');
        expect(molenweg.style.background).toBe('');
        expect(molenweg).toHaveAttribute('aria-selected', 'true');
        expect(screen.queryByTestId('mini-center')).toBeNull();
        expect(screen.queryByTestId('mini-space-photo')).toBeNull();
        // The warning still shows on its space.
        expect(
            screen
                .getByRole('option', {
                    name: /heeft een waarschuwing|waarschuwing/i,
                })
                .querySelector('svg'),
        ).not.toBeNull();
    });

    it('only moves the choice with the arrows when onMove is given; Enter opens', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        const onMove = vi.fn();
        renderWithI18n(
            <BoardNavigator
                edition={sampleEdition()}
                interfaceLanguage="nl"
                selected="space.01"
                onSelect={onSelect}
                onMove={onMove}
                warned={new Set()}
            />,
        );
        screen.getByRole('option', { name: 'Molenweg' }).focus();
        await user.keyboard('{ArrowRight}');

        expect(onMove).toHaveBeenCalledWith('space.02');
        expect(onSelect).not.toHaveBeenCalled();

        await user.keyboard('{Enter}');
        expect(onSelect).toHaveBeenCalledOnce();
    });
});
