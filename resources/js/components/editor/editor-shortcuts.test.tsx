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
const photoIssue: CheckIssue = {
    ...issue,
    id: 'photo.low-resolution|space.01|photo',
    code: 'photo.low-resolution',
    field: 'photo',
    message: { nl: 'De foto is zacht.', en: 'The photo is soft.' },
};

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () => fakePage({ auth: { googleLoginEnabled: true } }),
}));
vi.mock('@/components/editor/check-probe', () => ({
    useChecks: () => ({ issues: [issue, photoIssue], probe: null }),
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

describe('editor shortcuts', () => {
    it('undoes and redoes with Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl+Y outside text fields', async () => {
        const session = await open();
        renderWithI18n(<EditorWorkspace session={session} />);
        session.apply([
            { key: 'space.01', before: undefined, after: { name: 'Het Hok' } },
        ]);
        expect(session.edition.elements['space.01']?.name).toBe('Het Hok');

        fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
        expect(session.edition.elements['space.01']?.name).not.toBe('Het Hok');

        fireEvent.keyDown(document.body, {
            key: 'z',
            metaKey: true,
            shiftKey: true,
        });
        expect(session.edition.elements['space.01']?.name).toBe('Het Hok');

        fireEvent.keyDown(document.body, { key: 'z', metaKey: true });
        expect(session.edition.elements['space.01']?.name).not.toBe('Het Hok');
        fireEvent.keyDown(document.body, { key: 'y', ctrlKey: true });
        expect(session.edition.elements['space.01']?.name).toBe('Het Hok');
    });

    it('leaves Ctrl+Z to the browser inside a text field', async () => {
        const session = await open();
        renderWithI18n(<EditorWorkspace session={session} />);
        session.apply([
            { key: 'space.01', before: undefined, after: { name: 'Het Hok' } },
        ]);

        const notPrevented = fireEvent.keyDown(screen.getByLabelText('Naam'), {
            key: 'z',
            ctrlKey: true,
        });

        expect(notPrevented).toBe(true);
        expect(session.edition.elements['space.01']?.name).toBe('Het Hok');
    });
});

describe('focus after a message in the list of open messages (B197)', () => {
    it('moves to the field the warning is about', async () => {
        const user = userEvent.setup();
        const session = await open();
        renderWithI18n(<EditorWorkspace session={session} />);

        await user.keyboard('c');
        await user.click(
            await screen.findByRole('option', { name: /De tekst is te lang/ }),
        );

        expect(screen.getByLabelText('Naam')).toHaveFocus();
    });

    it('moves to the photo button when the warning is about a photo without a frame', async () => {
        const user = userEvent.setup();
        const session = await open();
        renderWithI18n(<EditorWorkspace session={session} />);

        await user.keyboard('c');
        await user.click(
            await screen.findByRole('option', { name: /De foto is zacht/ }),
        );

        expect(document.body).not.toHaveFocus();
        expect(document.activeElement).toHaveAttribute('data-field', 'photo');
    });
});
