import { act, fireEvent, screen } from '@testing-library/react';

import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { BoardNavigator } from './board-navigator';

const board = (onSwap = vi.fn<(from: string, to: string) => void>()) => {
    const onSelect = vi.fn<(key: string) => void>();
    renderWithI18n(
        <BoardNavigator
            edition={sampleEdition()}
            interfaceLanguage="nl"
            selected="space.01"
            onSelect={onSelect}
            warned={new Set()}
            onSwap={onSwap}
        />,
    );

    return { onSwap, onSelect };
};

const cell = (name: RegExp) => screen.getByRole('option', { name });

const pointUnder = (target: Element | null) => {
    Object.defineProperty(document, 'elementFromPoint', {
        value: () => target,
        configurable: true,
    });
};

afterEach(() => {
    Reflect.deleteProperty(document, 'elementFromPoint');
});

describe('useBoardSwap with a pointer', () => {
    it('drags a street onto another street with the mouse and says what stays', () => {
        const { onSwap, onSelect } = board();
        const listbox = screen.getByRole('listbox');
        pointUnder(cell(/Veldweg/));

        fireEvent.pointerDown(cell(/Molenweg/), {
            pointerType: 'mouse',
            button: 0,
            clientX: 0,
            clientY: 0,
        });
        fireEvent.pointerMove(listbox, { clientX: 20, clientY: 0 });

        expect(screen.getByRole('status')).toHaveTextContent(
            'Molenweg wordt versleept.',
        );
        expect(cell(/Veldweg/)).toHaveClass('outline-dashed');

        fireEvent.pointerUp(listbox);
        fireEvent.click(cell(/Molenweg/));

        expect(onSwap).toHaveBeenCalledWith('space.01', 'space.03');
        expect(screen.getByRole('status')).toHaveTextContent(
            'Prijs en kleur horen bij de plek.',
        );
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('refuses a drop on a space of another kind', () => {
        const { onSwap } = board();
        const listbox = screen.getByRole('listbox');
        pointUnder(cell(/^Start/));

        fireEvent.pointerDown(cell(/Molenweg/), {
            pointerType: 'mouse',
            button: 0,
            clientX: 0,
            clientY: 0,
        });
        fireEvent.pointerMove(listbox, { clientX: 20, clientY: 0 });
        fireEvent.pointerUp(listbox);

        expect(onSwap).not.toHaveBeenCalled();
        expect(screen.getByRole('status')).toHaveTextContent(
            'Wisselen kan alleen tussen straten',
        );
    });

    it('starts a drag on touch only after a long press, and lets a quick move scroll', () => {
        vi.useFakeTimers();
        const { onSwap } = board();
        const listbox = screen.getByRole('listbox');

        fireEvent.pointerDown(cell(/Molenweg/), {
            pointerType: 'touch',
            clientX: 0,
            clientY: 0,
        });
        fireEvent.pointerMove(listbox, { clientX: 30, clientY: 0 });
        act(() => {
            vi.advanceTimersByTime(400);
        });

        expect(screen.getByRole('status')).toBeEmptyDOMElement();

        fireEvent.pointerDown(cell(/Molenweg/), {
            pointerType: 'touch',
            clientX: 0,
            clientY: 0,
        });
        act(() => {
            vi.advanceTimersByTime(400);
        });

        expect(screen.getByRole('status')).toHaveTextContent(
            'Molenweg wordt versleept.',
        );

        fireEvent.pointerCancel(listbox);
        vi.useRealTimers();
        expect(onSwap).not.toHaveBeenCalled();
    });

    it('drags nothing from a space that cannot swap or with another mouse button', () => {
        board();
        const listbox = screen.getByRole('listbox');

        fireEvent.pointerDown(cell(/^Start/), {
            pointerType: 'mouse',
            button: 0,
        });
        fireEvent.pointerMove(listbox, { clientX: 20, clientY: 0 });
        fireEvent.pointerDown(cell(/Molenweg/), {
            pointerType: 'mouse',
            button: 2,
        });
        fireEvent.pointerMove(listbox, { clientX: 20, clientY: 0 });

        expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });
});
