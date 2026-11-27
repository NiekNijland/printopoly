import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditorWorkspace } from '@/features/edition/editor/editor-workspace';
import {
    openWorkspace,
    tabletUpright,
} from '@/features/edition/testing/workspace';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';


beforeEach(() => {
    setPage(fakePage({ auth: { googleLoginEnabled: true } }));
});

describe('EditorWorkspace preview', () => {
    it('has a tablet layout from 768 px: list beside the panel, the preview folding on top (B155)', async () => {
        const user = userEvent.setup();
        const media = tabletUpright();
        const { session } = await openWorkspace();

        const { container } = renderWithI18n(
            <EditorWorkspace session={session} />,
        );
        const workspace = container.querySelector('[data-workspace]');
        const preview = container.querySelector('[data-preview]');
        const fold = screen.getByRole('button', { name: /Inklappen/ });

        // Two columns from 768 px, three from 1024 px; the phone layout only below 768 px.
        expect(workspace).toHaveClass(
            'md:grid',
            'md:grid-cols-[minmax(240px,300px)_minmax(0,1fr)]',
            'lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)_minmax(320px,380px)]',
        );
        // A phone on its side and a low tablet put the preview beside the fields (bug 2).
        expect(workspace?.className).toContain('tablet-low:grid-cols-');
        expect(fold).toHaveAttribute('aria-expanded', 'true');
        // A full 44 px target, also while it lies on the preview.
        expect(fold).toHaveClass('min-h-11');

        // The bar lies in the flow under the preview and its hints, not on top of them (bug 29).
        expect(fold).not.toHaveClass('absolute');
        expect(fold).toHaveClass('order-last');

        await user.click(fold);
        expect(preview).toHaveAttribute('data-folded', 'true');
        expect(
            screen.getByRole('button', { name: /Voorbeeld tonen/ }),
        ).toHaveAttribute('aria-expanded', 'false');
        media.mockRestore();
    });

    it('folds the preview as soon as the fields scroll, and opens it again at the top (UX 5)', async () => {
        const media = tabletUpright();
        const { session } = await openWorkspace();

        const { container } = renderWithI18n(
            <EditorWorkspace session={session} />,
        );
        const preview = container.querySelector('[data-preview]');
        const fields = container.querySelector<HTMLElement>(
            'aside[data-editor-panel]',
        );
        if (fields === null) {
            throw new Error('No fields');
        }
        // A long form: it stays scrollable once the preview is folded.
        Object.defineProperty(fields, 'scrollHeight', { value: 2000 });
        const scrollTo = (top: number) => {
            fields.scrollTop = top;
            fireEvent.scroll(fields);
        };

        scrollTo(120);
        expect(preview).toHaveAttribute('data-folded', 'true');
        scrollTo(0);
        expect(preview).not.toHaveAttribute('data-folded');

        // Folded by hand, it stays folded at the top.
        fireEvent.click(screen.getByRole('button', { name: /Inklappen/ }));
        scrollTo(0);
        expect(preview).toHaveAttribute('data-folded', 'true');
        media.mockRestore();
    });

    it('opens the element picked in the list, with the Vak / Eigendomsbewijs switch for a street', async () => {
        const user = userEvent.setup();
        const { session } = await openWorkspace();

        renderWithI18n(<EditorWorkspace session={session} />);
        await user.click(screen.getByRole('button', { name: /Station Noord/ }));

        expect(
            screen.getByRole('heading', { name: 'Station Noord' }),
        ).toBeInTheDocument();
        const view = screen.getByRole('tablist', { name: 'Weergave' });
        await user.click(
            within(view).getByRole('tab', { name: 'Eigendomsbewijs' }),
        );
        expect(
            within(view).getByRole('tab', { name: 'Eigendomsbewijs' }),
        ).toHaveAttribute('aria-selected', 'true');

        await user.click(screen.getByRole('option', { name: /Start/ }));
        expect(
            screen.queryByRole('tablist', { name: 'Weergave' }),
        ).not.toBeInTheDocument();
    });
});
