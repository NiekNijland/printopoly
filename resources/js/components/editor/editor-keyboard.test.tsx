import { router } from '@inertiajs/react';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CheckIssue } from '@/lib/checks/types';
import { EditionBus } from '@/lib/edition/bus';
import { EditionSession } from '@/lib/edition/session';
import { installMemoryServices, sampleEdition } from '@/testing/editions';
import { setPage } from '@/testing/inertia';
import { mediaQueryList } from '@/testing/media-query';
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

beforeEach(() => {
    window.localStorage.clear();
    setPage(fakePage({ auth: { googleLoginEnabled: true } }));
});

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

    it('keeps the single letters quiet when the focus fell back to the page after closing something (UX 8, B179)', async () => {
        const user = userEvent.setup();
        renderWithI18n(<EditorWorkspace session={await open()} />);
        const first = nameField().value;

        await user.keyboard('?');
        expect(
            await screen.findByRole('dialog', { name: 'Sneltoetsen' }),
        ).toBeInTheDocument();
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(document.activeElement).toBe(document.body);

        await user.keyboard('k');
        expect(nameField().value).toBe(first);

        // A click on the page itself says you are back on the editor: the letters work again.
        await user.pointer({ keys: '[MouseLeft]', target: document.body });
        await user.keyboard('k');
        expect(nameField().value).not.toBe(first);
    });

    it('turns the single-letter shortcuts off from the dialog', async () => {
        const user = userEvent.setup();
        renderWithI18n(<EditorWorkspace session={await open()} />);
        const first = nameField().value;

        fireEvent.keyDown(document.body, { key: '?', shiftKey: true });
        await user.click(
            await screen.findByRole('switch', {
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

    it('opens the first hit with Enter in the search and keeps the focus on its row (bug 15)', async () => {
        const user = userEvent.setup();
        renderWithI18n(<EditorWorkspace session={await open()} />);

        await user.click(screen.getByLabelText('Zoek een vak'));
        await user.keyboard('kroon{Enter}');
        const row = await screen.findByLabelText<HTMLInputElement>(
            'Naam van Kroonplein',
        );
        await vi.waitFor(() => expect(row).toHaveFocus());
        expect(nameField().value).toBe('Kroonplein');

        // Enter in the only row left keeps the focus on that row, not on the page.
        await user.keyboard('{Enter}');
        expect(document.activeElement).not.toBe(document.body);
        expect(document.activeElement?.closest('li')).toBe(row.closest('li'));
    });

    it('says a space has no name on F2, and keeps the focus in the panel (bug 43)', async () => {
        renderWithI18n(<EditorWorkspace session={await open()} />);
        // The space after Molenweg is Algemeen Fonds, which has no name field.
        fireEvent.keyDown(document.body, { key: 'j' });
        fireEvent.keyDown(document.body, { key: 'F2' });

        expect(
            screen.getByText('Dit vak heeft geen naam om te veranderen.'),
        ).toBeInTheDocument();
        expect(document.activeElement).not.toBe(document.body);
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

    it('opens the open messages with C and closes them with Escape (B197)', async () => {
        const user = userEvent.setup();
        renderWithI18n(<EditorWorkspace session={await open()} />);

        // No Controle button and no counter in sight while you work.
        expect(
            screen.queryByRole('button', { name: /Controle/ }),
        ).not.toBeInTheDocument();

        fireEvent.keyDown(document.body, { key: 'c' });
        const dialog = await screen.findByRole('dialog', {
            name: 'Nog even nakijken',
        });
        expect(
            within(dialog).getByRole('option', { name: /De tekst is te lang/ }),
        ).toBeInTheDocument();

        await user.keyboard('{Escape}');
        await vi.waitFor(() =>
            expect(
                screen.queryByRole('dialog', { name: 'Nog even nakijken' }),
            ).not.toBeInTheDocument(),
        );
    });

    it('closes Voorbeeld with Escape, back on the button that opened it (bug 30)', async () => {
        const user = userEvent.setup();
        renderWithI18n(<EditorWorkspace session={await open()} />);
        const button = screen
            .getAllByRole('button', { name: /^Voorbeeld/ })
            .find((node) => node.hasAttribute('data-preview-toggle'));
        expect(button).toBeDefined();

        await user.click(button as HTMLElement);
        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        await user.keyboard('{Escape}');

        await vi.waitFor(() =>
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
        );
        expect(document.activeElement).toHaveAttribute('data-preview-toggle');
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
        const media = vi
            .spyOn(window, 'matchMedia')
            .mockImplementation((query: string) =>
                mediaQueryList(query, false),
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

    it('lists the four tabs under the number keys, as the editor always shows all parts (bug 37, B198)', async () => {
        renderWithI18n(<EditorWorkspace session={await open()} />);

        fireEvent.keyDown(document.body, { key: '?' });

        expect(
            await screen.findByText('Naar Bord, Kaarten, Geld of Doos'),
        ).toBeInTheDocument();
        expect(screen.getAllByText('1…4').length).toBeGreaterThan(0);
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

        expect(list).toHaveClass('md:border-r-2');
        expect(list).not.toHaveClass('border-r-2');
    });
});
