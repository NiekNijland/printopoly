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

        fireEvent.keyDown(document.body, { key: 'j' });
        expect(nameField().value).not.toBe(first);

        fireEvent.keyDown(document.body, { key: 'k' });
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
