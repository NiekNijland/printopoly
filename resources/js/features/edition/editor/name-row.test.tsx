import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSyncExternalStore } from 'react';

import { EditionSession } from '@/features/edition/session';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import type { Edition } from '@/lib/render/edition-types';
import {
    makeBus,
    makeEdition,
    ManualScheduler,
} from '@/testing/edition-test-utils';
import { renderWithI18n } from '@/testing/render';

import { NameRow } from './name-row';

const open = (edition: Edition = makeEdition()): EditionSession =>
    new EditionSession(edition, {
        storage: new MemoryEditionStorage(),
        bus: makeBus(null, 'w1'),
        now: () => 1_000,
        scheduler: new ManualScheduler(),
    });

type Handlers = {
    onOpen: (key: string) => void;
    onFocusRow: (key: string) => void;
    onAnnounce: (text: string) => void;
};

const List = ({
    session,
    keys,
    handlers,
    warned = false,
}: {
    session: EditionSession;
    keys: string[];
    handlers: Handlers;
    warned?: boolean;
}) => {
    const edition = useSyncExternalStore(
        (listener) => session.subscribe(listener),
        () => session.edition,
    );

    return (
        <ul data-name-list>
            {keys.map((key) => (
                <NameRow
                    key={key}
                    elementKey={key}
                    edition={edition}
                    interfaceLanguage="nl"
                    session={session}
                    selected={key === keys[0]}
                    warned={warned}
                    leading={<span>•</span>}
                    {...handlers}
                />
            ))}
        </ul>
    );
};

const mount = (keys: string[], edition?: Edition, warned = false) => {
    const session = open(edition);
    const handlers = {
        onOpen: vi.fn<(key: string) => void>(),
        onFocusRow: vi.fn<(key: string) => void>(),
        onAnnounce: vi.fn<(text: string) => void>(),
    };
    renderWithI18n(
        <List
            session={session}
            keys={keys}
            handlers={handlers}
            warned={warned}
        />,
    );

    return { session, ...handlers };
};

describe('NameRow', () => {
    it('lets the name be typed in place and shows that element', async () => {
        const user = userEvent.setup();
        const { session, onFocusRow } = mount(['space.01']);
        const field = screen.getByRole('textbox', {
            name: 'Naam van Molenweg',
        });

        await user.clear(field);
        await user.type(field, 'Beuk');

        expect(onFocusRow).toHaveBeenCalledWith('space.01');
        expect(session.edition.elements['space.01']?.name).toBe('Beuk');
        session.undo();
        expect(session.edition.elements['space.01']).toBeUndefined();
    });

    it('keeps an emptied street empty, with the standard name in grey', async () => {
        const user = userEvent.setup();
        const { session } = mount(['space.01']);
        const field = screen.getByRole('textbox', {
            name: 'Naam van Molenweg',
        });

        await user.clear(field);
        await user.tab();

        expect(session.edition.elements['space.01']?.name).toBe('');
        expect(field).toHaveValue('');
        expect(field).toHaveAttribute('placeholder', 'Molenweg');
    });

    it('lets an emptied pawn go back to its standard name', async () => {
        const user = userEvent.setup();
        const edition = makeEdition({ parts: { pawns: true } });
        edition.elements['pawn.01'] = { name: 'Fiets' };
        const { session } = mount(['pawn.01'], edition);

        await user.clear(screen.getByRole('textbox'));

        expect(session.edition.elements['pawn.01']).toBeUndefined();
    });

    it('says in its button what it is and opens the element', async () => {
        const user = userEvent.setup();
        const edition = makeEdition();
        edition.elements['space.01'] = { name: 'Beukenlaan' };
        const { onOpen } = mount(['space.01'], edition, true);

        const button = screen.getByRole('button', {
            name: 'Beukenlaan, aangepast, heeft een waarschuwing',
        });
        expect(button).toHaveAttribute('aria-current', 'true');
        await user.click(button);

        expect(onOpen).toHaveBeenCalledExactlyOnceWith('space.01');
    });

    it('walks the rows with Enter and the arrow keys, and stays on the last row', async () => {
        const user = userEvent.setup();
        mount(['space.01', 'space.03']);
        const [first, second] = screen.getAllByRole('textbox');

        await user.click(first ?? document.body);
        await user.keyboard('{Enter}');
        expect(second).toHaveFocus();

        await user.keyboard('{ArrowUp}');
        expect(first).toHaveFocus();

        await user.keyboard('{ArrowDown}');
        expect(second).toHaveFocus();

        await user.keyboard('{ArrowDown}');
        expect(second).toHaveFocus();

        await user.keyboard('{Enter}');
        expect(document.activeElement?.getAttribute('data-row-open')).toBe(
            'space.03',
        );
    });

    it('fills this row and the next ones from a paste of several lines, and says what it did', async () => {
        const { session, onAnnounce } = mount([
            'space.01',
            'space.03',
            'space.06',
        ]);
        const [first] = screen.getAllByRole('textbox');

        fireEvent.paste(first ?? document.body, {
            clipboardData: { getData: () => 'Beuk\nEik\nLinde' },
        });

        expect(session.edition.elements['space.06']?.name).toBe('Linde');
        expect(onAnnounce).toHaveBeenCalledExactlyOnceWith(
            '3 namen ingevuld. 2 vakken van een andere soort zijn overgeslagen.',
        );
        await waitFor(() =>
            expect(screen.getAllByRole('textbox')[2]).toHaveFocus(),
        );
        session.undo();
        expect(session.edition.elements['space.01']).toBeUndefined();
    });

    it('says how many lines were left over', () => {
        const { onAnnounce } = mount(['space.35']);

        fireEvent.paste(screen.getByRole('textbox'), {
            clipboardData: { getData: () => 'Bus\nBoot' },
        });

        expect(onAnnounce).toHaveBeenCalledExactlyOnceWith(
            '1 naam ingevuld. 1 regel bleef over.',
        );
    });

    it('leaves a paste of one line to the field', () => {
        const { session, onAnnounce } = mount(['space.01']);

        fireEvent.paste(screen.getByRole('textbox'), {
            clipboardData: { getData: () => 'Beuk' },
        });

        expect(onAnnounce).not.toHaveBeenCalled();
        expect(session.canUndo).toBe(false);
    });
});
