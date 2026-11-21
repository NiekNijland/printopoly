import { router } from '@inertiajs/react';
import type * as InertiaReact from '@inertiajs/react';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CheckIssue } from '@/lib/checks/types';
import { EditionBus } from '@/lib/edition/bus';
import { EditionSession } from '@/lib/edition/session';
import { installMemoryServices, sampleEdition } from '@/testing/editions';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

import { EditorWorkspace } from './editor-workspace';

const issue: CheckIssue = {
    id: 'text.too-long|space.01|name',
    code: 'text.too-long',
    elementKey: 'space.01',
    field: 'name',
    severity: 'warning',
    icon: 'triangle-alert',
    severityLabel: { nl: 'Waarschuwing', en: 'Warning' },
    message: { nl: 'De tekst is te lang.', en: 'The text is too long.' },
};

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () => fakePage({ auth: { googleLoginEnabled: true } }),
}));
vi.mock('@/components/editor/check-probe', () => ({
    useChecks: () => ({ issues: [issue], probe: null }),
}));

async function open() {
    const services = installMemoryServices();
    const edition = sampleEdition();
    await services.storage.createEdition(edition);

    return new EditionSession(edition, {
        storage: services.storage,
        bus: new EditionBus(null, 'w'),
        now: () => Date.now(),
        debounceMs: 5,
    });
}

const nameField = () => screen.getByLabelText<HTMLInputElement>('Naam');

beforeEach(() => window.localStorage.clear());

describe('editor keyboard shortcuts', () => {
    it('moves to the next and previous element with J and K', async () => {
        renderWithI18n(<EditorWorkspace session={await open()} />);
        const first = nameField().value;

        // Back to Start and forward again: the space after Molenweg is Algemeen Fonds, which has no name field.
        fireEvent.keyDown(document.body, { key: 'k' });
        expect(nameField().value).not.toBe(first);

        fireEvent.keyDown(document.body, { key: 'j' });
        expect(nameField().value).toBe(first);
    });

    it('does not fire while typing in a field', async () => {
        const user = userEvent.setup();
        renderWithI18n(<EditorWorkspace session={await open()} />);
        const first = nameField().value;

        await user.click(nameField());
        await user.keyboard('jkc1?');

        expect(nameField().value).toBe(`${first}jkc1?`);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('leaves the field with Escape, so J is a shortcut again and not text', async () => {
        const user = userEvent.setup();
        renderWithI18n(<EditorWorkspace session={await open()} />);
        const first = nameField().value;

        await user.click(nameField());
        await user.keyboard('x{Escape}');
        expect(nameField()).not.toHaveFocus();

        await user.keyboard('k');
        expect(nameField().value).not.toBe(`${first}xk`);
        expect(nameField().value).not.toBe(`${first}x`);
    });

    it('leaves a one-line field with Enter and commits what was typed', async () => {
        const user = userEvent.setup();
        renderWithI18n(<EditorWorkspace session={await open()} />);

        await user.click(nameField());
        await user.clear(nameField());
        await user.keyboard('Dorpsstraat{Enter}');
        expect(nameField()).not.toHaveFocus();
        expect(nameField().value).toBe('Dorpsstraat');

        await user.keyboard('k');
        expect(nameField().value).not.toBe('Dorpsstraatk');
    });

    it('does not carry a typed name over to the element chosen next, even without leaving the field', async () => {
        const user = userEvent.setup();
        renderWithI18n(<EditorWorkspace session={await open()} />);
        const first = nameField().value;

        await user.click(nameField());
        await user.clear(nameField());
        await user.keyboard('Dorpskist');
        // The board moves on while the field is still focused, the way a shortcut or a script does it.
        fireEvent.keyDown(document.body, { key: '[' });

        expect(nameField().value).not.toBe('Dorpskist');
        expect(nameField().value).not.toBe(first);
    });

    it('opens the Sneltoetsen dialog with ? and keeps the page quiet behind it', async () => {
        renderWithI18n(<EditorWorkspace session={await open()} />);
        const first = nameField().value;

        fireEvent.keyDown(document.body, { key: '?', shiftKey: true });
        expect(
            await screen.findByRole('dialog', { name: 'Sneltoetsen' }),
        ).toBeInTheDocument();

        fireEvent.keyDown(document.body, { key: 'j' });
        expect(nameField().value).toBe(first);
    });

    it('turns the single-letter shortcuts off from the dialog', async () => {
        const user = userEvent.setup();
        renderWithI18n(<EditorWorkspace session={await open()} />);
        const first = nameField().value;

        fireEvent.keyDown(document.body, { key: '?', shiftKey: true });
        await user.click(
            await screen.findByRole('checkbox', {
                name: /Sneltoetsen met een losse letter/,
            }),
        );
        await user.keyboard('{Escape}');
        fireEvent.keyDown(document.body, { key: 'j' });

        expect(nameField().value).toBe(first);
        expect(window.localStorage.getItem('printopoly.shortcuts.plain')).toBe(
            'off',
        );
    });

    it('focuses the name field with F2', async () => {
        renderWithI18n(<EditorWorkspace session={await open()} />);

        fireEvent.keyDown(document.body, { key: 'F2' });

        expect(nameField()).toHaveFocus();
    });

    it('switches part with the digits and Alt+digit', async () => {
        renderWithI18n(<EditorWorkspace session={await open()} />);
        const tabs = screen.getAllByRole('tab');

        fireEvent.keyDown(document.body, { key: '2' });
        expect(tabs[1]).toHaveAttribute('aria-selected', 'true');

        fireEvent.keyDown(document.body, {
            key: '¡',
            code: 'Digit1',
            altKey: true,
        });
        expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('opens Controle with C and closes it with Escape, back on its button', async () => {
        renderWithI18n(<EditorWorkspace session={await open()} />);

        fireEvent.keyDown(document.body, { key: 'c' });
        expect(
            screen.getByRole('button', { name: /De tekst is te lang/ }),
        ).toBeInTheDocument();

        fireEvent.keyDown(document.body, { key: 'Escape' });
        expect(
            screen.queryByRole('button', { name: /De tekst is te lang/ }),
        ).not.toBeInTheDocument();
        expect(document.activeElement).toHaveAttribute('data-check-toggle');
    });

    it('shows "Opgeslagen" on Ctrl+S, also inside a field, without the browser dialog', async () => {
        renderWithI18n(<EditorWorkspace session={await open()} />);

        const notPrevented = fireEvent.keyDown(nameField(), {
            key: 's',
            ctrlKey: true,
        });

        expect(notPrevented).toBe(false);
        expect(await screen.findByText('Opgeslagen')).toBeInTheDocument();
    });

    it('goes to the print page on Cmd+P', async () => {
        const visit = vi
            .spyOn(router, 'visit')
            .mockImplementation(() => undefined);
        renderWithI18n(<EditorWorkspace session={await open()} />);

        const notPrevented = fireEvent.keyDown(document.body, {
            key: 'p',
            metaKey: true,
        });

        expect(notPrevented).toBe(false);
        expect(visit).toHaveBeenCalledWith(expect.stringMatching(/\/print$/));
        visit.mockRestore();
    });

    it('gives the controls a shortcut hint', async () => {
        renderWithI18n(<EditorWorkspace session={await open()} />);

        expect(
            screen.getAllByRole('button', { name: 'Ongedaan maken' })[0],
        ).toHaveAttribute('aria-keyshortcuts', 'Control+Z Meta+Z');
        expect(screen.getAllByRole('tab')[0]).toHaveAttribute(
            'aria-keyshortcuts',
            '1 Alt+1',
        );
    });
});

describe('keyboard on a phone and the shortcut list (ronde 3)', () => {
    it('opens the chosen space with Enter after J on the phone overview (bug 37)', async () => {
        const media = vi.spyOn(window, 'matchMedia').mockImplementation(
            (query: string) =>
                ({
                    matches: false,
                    media: query,
                    addEventListener: () => undefined,
                    removeEventListener: () => undefined,
                }) as unknown as MediaQueryList,
        );
        renderWithI18n(<EditorWorkspace session={await open()} />);
        // The phone starts on the overview: the bottom bar has no arrows of an element yet.
        expect(
            screen.queryByRole('button', { name: 'Volgende' }),
        ).not.toBeInTheDocument();

        fireEvent.keyDown(document.body, { key: 'j' });
        fireEvent.keyDown(document.body, { key: 'Enter' });

        expect(
            screen.getByRole('button', { name: 'Volgende' }),
        ).toBeInTheDocument();
        media.mockRestore();
    });

    it('lists only the tabs this edition has under the number keys (bug 37)', async () => {
        renderWithI18n(<EditorWorkspace session={await open()} />);

        fireEvent.keyDown(document.body, { key: '?' });

        expect(
            await screen.findByText('Naar Bord of Kaarten'),
        ).toBeInTheDocument();
        expect(screen.getAllByText('1…2').length).toBeGreaterThan(0);
    });

    it('never scrolls the page around the columns (bug 12)', async () => {
        renderWithI18n(<EditorWorkspace session={await open()} />);

        expect(screen.getByRole('main')).toHaveClass('overflow-clip');
        expect(screen.getByRole('main')).not.toHaveClass('overflow-auto');
    });

    it('draws the line between list and preview only next to the preview, not on a phone (bug 40)', async () => {
        renderWithI18n(<EditorWorkspace session={await open()} />);
        const list = screen.getByRole('navigation', {
            name: 'Onderdelen van de editie',
        });

        expect(list).toHaveClass('lg:border-r-2');
        expect(list).not.toHaveClass('border-r-2');
    });
});
