import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'react';

import { EditionBus } from '@/lib/edition/bus';
import { EditionSession } from '@/lib/edition/session';
import { MemoryEditionStorage } from '@/lib/edition/storage';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import {
    BoardList,
    BoardNavigator,
    fitFont,
    gridCell,
    gridTemplate,
    spaceNameFont,
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
        // The letter of a space name follows its length.
        expect(fitFont(35, 1.1, 1.25, 2)).toBe('min(1.25rem, 10.91cqw)');
    });

    it('puts every name in its space on the big board', () => {
        renderWithI18n(
            <BoardNavigator
                names
                edition={sampleEdition()}
                interfaceLanguage="nl"
                selected="space.01"
                onSelect={() => undefined}
                warned={new Set()}
            />,
        );
        const molenweg = screen.getByRole('option', { name: 'Molenweg' });

        expect(molenweg).toHaveTextContent('Molenweg');
        expect(screen.getByRole('option', { name: 'Start' })).toHaveTextContent(
            'Start',
        );
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
        expect(onAnnounce).toHaveBeenCalledWith('3 namen ingevuld.');

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

describe('spaceNameFont (big board, ronde 3)', () => {
    it('sizes a name so its longest word fits on one line', () => {
        // Two lines of 8 letters would do for "Community Chest", but "Community" alone has 9, with room to spare.
        expect(spaceNameFont('Community Chest', false)).toContain(
            `${((0.11 * 100) / (12 * 0.56)).toFixed(2)}cqw`,
        );
        // A long word without a capital may hyphenate, so it does not shrink the name.
        expect(spaceNameFont('The club championships', false)).toContain(
            `${((0.11 * 100) / (11 * 0.56)).toFixed(2)}cqw`,
        );
        // Short words: the length over two lines counts.
        expect(spaceNameFont('Go to Jail', true)).toContain(
            `${((0.14 * 100) / (5 * 0.56)).toFixed(2)}cqw`,
        );
    });
});
