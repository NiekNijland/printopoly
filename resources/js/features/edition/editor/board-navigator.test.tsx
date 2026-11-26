import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'react';

import { EditionBus } from '@/features/edition/bus';
import { EditionSession } from '@/features/edition/session';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import { clearNamesChanges } from '@/lib/render/editor-clear-names';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
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

describe('gridCell', () => {
    it('puts Start bottom right and walks anticlockwise round the board', () => {
        expect(gridCell(0)).toEqual({ row: 10, col: 10 });
        expect(gridCell(10)).toEqual({ row: 10, col: 0 });
        expect(gridCell(20)).toEqual({ row: 0, col: 0 });
        expect(gridCell(30)).toEqual({ row: 0, col: 10 });
        expect(gridCell(39)).toEqual({ row: 9, col: 10 });
    });
});

function listSession() {
    const edition = sampleEdition();

    return new EditionSession(edition, {
        storage: new MemoryEditionStorage(),
        bus: new EditionBus(null, 'w'),
        now: () => 5,
        debounceMs: 1000,
    });
}

/** The list as the editor shows it: it follows the session. */
function LiveList({
    session,
    query = '',
    onSelect = () => undefined,
    onAnnounce = () => undefined,
}: {
    session: EditionSession;
    query?: string;
    onSelect?: (key: string) => void;
    onAnnounce?: (text: string) => void;
}) {
    const [edition, setEdition] = useState(session.edition);
    useEffect(
        () => session.subscribe(() => setEdition(session.edition)),
        [session],
    );

    return (
        <BoardList
            edition={edition}
            interfaceLanguage="nl"
            selected="space.01"
            onSelect={onSelect}
            warned={new Set()}
            session={session}
            query={query}
            onAnnounce={onAnnounce}
        />
    );
}

describe('BoardList', () => {
    it('lists the board per side and picks a space', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();

        renderWithI18n(
            <LiveList session={listSession()} onSelect={onSelect} />,
        );
        await user.click(screen.getByRole('button', { name: /Veldweg/ }));

        expect(onSelect).toHaveBeenCalledWith('space.03');
        expect(screen.getAllByRole('list').length).toBeGreaterThan(4);
    });

    it('ends a long name with dots instead of a hard edge (bug 23)', () => {
        renderWithI18n(<LiveList session={listSession()} />);

        expect(screen.getByLabelText('Naam van Veldweg')).toHaveClass(
            'text-ellipsis',
        );
    });

    it('starts with the centre of the board, so the logo and photo are found from the list (UX 9)', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();

        renderWithI18n(
            <LiveList session={listSession()} onSelect={onSelect} />,
        );
        const rows = screen.getAllByRole('button');
        expect(rows[0]).toHaveAccessibleName(/^Midden van het bord/);

        await user.click(rows[0]!);
        expect(onSelect).toHaveBeenCalledWith('board_center');
    });

    it('leaves an emptied name empty in its row, with the standard name only as a hint (B214, B258)', async () => {
        const user = userEvent.setup();
        const session = listSession();
        session.apply(clearNamesChanges(session.edition));

        renderWithI18n(<LiveList session={session} />);
        const row = screen.getByRole('textbox', {
            name: 'Naam van Vak 1, nog zonder naam',
        });
        expect(row).toHaveValue('');
        expect(row).toHaveAttribute('placeholder', 'Molenweg');

        await user.type(row, 'Kerkpad');
        expect(session.edition.elements['space.01']?.name).toBe('Kerkpad');
    });

    it('keeps a name you empty empty when you leave the row, instead of the standard name (R6 Aisha, Sara; B258)', async () => {
        const user = userEvent.setup();
        const session = listSession();

        renderWithI18n(<LiveList session={session} />);
        const first = screen.getByRole('textbox', {
            name: 'Naam van Molenweg',
        });
        await user.clear(first);
        await user.tab();

        expect(session.edition.elements['space.01']?.name).toBe('');
        const emptied = screen.getByRole('textbox', {
            name: 'Naam van Vak 1, nog zonder naam',
        });
        expect(emptied).toHaveValue('');
        expect(emptied).toHaveAttribute('placeholder', 'Molenweg');
    });

    // B161 (ronde 3): names as a list.
    it('takes a name typed in the row, and Tab goes to the next space', async () => {
        const user = userEvent.setup();
        const session = listSession();

        renderWithI18n(<LiveList session={session} />);
        const first = screen.getByRole('textbox', {
            name: 'Naam van Molenweg',
        });
        await user.clear(first);
        await user.type(first, 'Kerkpad');
        expect(session.edition.elements['space.01']?.name).toBe('Kerkpad');

        await user.tab();
        expect(document.activeElement).toBe(
            screen.getByRole('textbox', { name: 'Naam van Veldweg' }),
        );
        // Typing a name is one undo step.
        session.undo();
        expect(session.edition.elements['space.01']).toBeUndefined();
    });

    it('fills the next spaces of the same kind from a paste of several lines, as one undo step', async () => {
        const user = userEvent.setup();
        const session = listSession();
        const onAnnounce = vi.fn();

        renderWithI18n(<LiveList session={session} onAnnounce={onAnnounce} />);
        const first = screen.getByRole('textbox', {
            name: 'Naam van Molenweg',
        });
        await user.click(first);
        await user.paste('Kerkpad\nDorpsstraat\n\nMarkt');

        expect(session.edition.elements['space.01']?.name).toBe('Kerkpad');
        expect(session.edition.elements['space.03']?.name).toBe('Dorpsstraat');
        // Station Noord (5) is not a street: the third name goes to the next street.
        expect(session.edition.elements['space.05']).toBeUndefined();
        expect(session.edition.elements['space.06']?.name).toBe('Markt');
        // It says which rows it passed over (vindbaarheid point 3): the tax space and the station.
        expect(onAnnounce).toHaveBeenCalledWith(
            '3 namen ingevuld. 2 vakken van een andere soort zijn overgeslagen.',
        );

        session.undo();
        expect(session.edition.elements).toEqual({});
    });

    it('shows only the spaces the search finds, and says when there are none', () => {
        const session = listSession();
        const view = renderWithI18n(
            <LiveList session={session} query="station" />,
        );

        expect(
            screen
                .getAllByRole('textbox')
                .map((input) => (input as HTMLInputElement).value),
        ).toEqual([
            'Station Noord',
            'Station Oost',
            'Station Zuid',
            'Station West',
        ]);

        view.unmount();
        renderWithI18n(<LiveList session={session} query="xyzzy" />);
        expect(screen.getByRole('status')).toHaveTextContent(
            'Niets gevonden voor "xyzzy".',
        );
    });
});

describe('BoardList photos (B238)', () => {
    /** A drag between rows as the browser sends it: the same data travels from start to drop. */
    function dataTransfer() {
        const data = new Map<string, string>();

        return {
            setData: (type: string, value: string) => data.set(type, value),
            getData: (type: string) => data.get(type) ?? '',
            get types() {
                return [...data.keys()];
            },
            effectAllowed: 'all',
            dropEffect: 'none',
        };
    }

    it('shows the photo of a space in its row and trades it by dragging it to another row', () => {
        const edition = sampleEdition();
        const placement = {
            photoId: 'p1',
            cx: 0.5,
            cy: 0.5,
            scale: 1,
            rotation: 0,
            grayscale: false,
        };
        const onSwapPhoto = vi.fn();
        const photos = new Map([
            ['p1', { id: 'p1', url: 'blob:p1', width: 8, height: 6 }],
        ]);

        renderWithI18n(
            <BoardList
                edition={{
                    ...edition,
                    elements: { 'space.01': { photo: placement } },
                }}
                interfaceLanguage="nl"
                selected="space.01"
                onSelect={() => undefined}
                warned={new Set()}
                session={listSession()}
                photos={photos}
                onSwapPhoto={onSwapPhoto}
            />,
        );
        const thumb = document.querySelector<HTMLElement>(
            '[data-row-photo="space.01"]',
        );
        expect(thumb).not.toBeNull();
        expect(thumb).toHaveAttribute('draggable', 'true');
        expect(document.querySelectorAll('[data-row-photo]')).toHaveLength(1);

        const transfer = dataTransfer();
        const target = screen
            .getByRole('textbox', { name: /Veldweg/ })
            .closest('div') as HTMLElement;
        fireEvent.dragStart(thumb as HTMLElement, { dataTransfer: transfer });
        fireEvent.dragOver(target, { dataTransfer: transfer });
        fireEvent.drop(target, { dataTransfer: transfer });

        expect(onSwapPhoto).toHaveBeenCalledWith('space.01', 'space.03');
    });
});
