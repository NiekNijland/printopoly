import { act, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

import { useBackCloses } from './use-back-closes';

function Screens() {
    const [element, setElement] = useState(false);
    const [board, setBoard] = useState(false);
    useBackCloses(element, () => setElement(false));
    useBackCloses(board, () => setBoard(false));

    return (
        <>
            <p>
                {element ? 'element open' : 'list'}
                {board ? ', board open' : ''}
            </p>
            <button type="button" onClick={() => setElement(true)}>
                open element
            </button>
            <button type="button" onClick={() => setBoard(true)}>
                open board
            </button>
            <button type="button" onClick={() => setElement(false)}>
                close element
            </button>
        </>
    );
}

/** What Inertia does with a back step: anything that reaches it leaves the page. */
function inertiaListener() {
    const left = vi.fn();
    window.addEventListener('popstate', left);

    return {
        left,
        stop: () => window.removeEventListener('popstate', left),
    };
}

/** The back button; the hook swallows the event, so the test waits for what it shows. */
async function back(text: string): Promise<void> {
    act(() => window.history.back());
    expect(await screen.findByText(text)).toBeInTheDocument();
}

describe('useBackCloses (R5-14)', () => {
    it('closes the open layers one by one before the page hears of the back button', async () => {
        const inertia = inertiaListener();
        const start = window.history.length;
        render(<Screens />);

        act(() => screen.getByText('open element').click());
        act(() => screen.getByText('open board').click());
        expect(
            screen.getByText('element open, board open'),
        ).toBeInTheDocument();
        expect(window.history.length).toBe(start + 2);

        await back('element open');
        await back('list');
        expect(inertia.left).not.toHaveBeenCalled();
        inertia.stop();
    });

    it('keeps working after Inertia writes the scroll position into the entry', async () => {
        const inertia = inertiaListener();
        render(<Screens />);

        act(() => screen.getByText('open element').click());
        // What Inertia does on scroll: a new state for the same entry, without an address.
        window.history.replaceState(
            { page: { url: '/x' }, scrollRegions: [] },
            '',
        );
        act(() => screen.getByText('open board').click());

        await back('element open');
        await back('list');
        expect(inertia.left).not.toHaveBeenCalled();
        inertia.stop();
    });

    it('takes the entry away again when a layer closes by its own button', async () => {
        const inertia = inertiaListener();
        render(<Screens />);
        const state: unknown = window.history.state;

        act(() => screen.getByText('open element').click());
        expect(window.history.state).not.toEqual(state);
        act(() => screen.getByText('close element').click());

        await waitFor(() => expect(window.history.state).toEqual(state));
        expect(inertia.left).not.toHaveBeenCalled();
        inertia.stop();
    });

    it('listens from the start, before Inertia adds its own listener (R6 Aisha, Sara)', async () => {
        // Chrome calls the listeners of the window in the order they were added; the app calls this before Inertia
        // boots, so a back step never reaches Inertia, which would render the editor again on the tab Bord.
        vi.resetModules();
        const fresh = await import('./use-back-closes');
        const added = vi.spyOn(window, 'addEventListener');
        fresh.listenForBackLayers();
        fresh.listenForBackLayers();
        const popstate = added.mock.calls.filter(
            ([type]) => type === 'popstate',
        );
        expect(popstate).toHaveLength(1);
        expect(popstate[0]?.[2]).toEqual({ capture: true });
        added.mockRestore();
    });
});
