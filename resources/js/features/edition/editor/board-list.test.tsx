import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'react';

import { EditionBus } from '@/features/edition/bus';
import { EditionSession } from '@/features/edition/session';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import { clearNamesChanges } from '@/lib/render/editor-clear-names';
import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { BoardList } from './board-list';

const listSession = () => {
    const edition = sampleEdition();

    return new EditionSession(edition, {
        storage: new MemoryEditionStorage(),
        bus: new EditionBus(null, 'w'),
        now: () => 5,
        debounceMs: 1000,
    });
};

/** The list as the editor shows it: it follows the session. */
const LiveList = ({
    session,
    query = '',
    onSelect = () => undefined,
    onAnnounce = () => undefined,
}: {
    session: EditionSession;
    query?: string;
    onSelect?: (key: string) => void;
    onAnnounce?: (text: string) => void;
}) => {
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
};

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
        const [first] = screen.getAllByRole('button');
        expect(first).toHaveAccessibleName(/^Midden van het bord/);

        await user.click(
            screen.getByRole('button', { name: /^Midden van het bord/ }),
        );
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
                .getAllByRole<HTMLInputElement>('textbox')
                .map((input) => input.value),
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
    const dataTransfer = () => {
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
    };

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
        const thumb = screen.getByRole('img', {
            name: 'Foto van Molenweg. Sleep hem naar een ander vak om te wisselen.',
        });
        expect(thumb).toHaveAttribute('data-row-photo', 'space.01');
        expect(thumb).toHaveAttribute('draggable', 'true');
        expect(document.querySelectorAll('[data-row-photo]')).toHaveLength(1);

        const transfer = dataTransfer();
        const target = screen.getByRole('textbox', {
            name: /Veldweg/,
        }).parentElement;
        if (target === null) {
            throw new Error('The row of Veldweg is missing.');
        }
        fireEvent.dragStart(thumb, { dataTransfer: transfer });
        fireEvent.dragOver(target, { dataTransfer: transfer });
        fireEvent.drop(target, { dataTransfer: transfer });

        expect(onSwapPhoto).toHaveBeenCalledWith('space.01', 'space.03');
    });
});
