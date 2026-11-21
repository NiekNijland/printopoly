import { act, render, screen, waitFor } from '@testing-library/react';

import { updateElement } from '@/lib/edition/changes';
import type { Edition } from '@/lib/edition/types';
import { sampleEdition } from '@/testing/editions';

import { useChecks } from './check-probe';

function Count({ edition }: { edition: Edition }) {
    const { issues, probe } = useChecks(edition, new Map());

    return (
        <>
            <output>
                {issues
                    .map((issue) => `${issue.code}:${issue.elementKey}`)
                    .join(' ')}
            </output>
            {probe}
        </>
    );
}

describe('useChecks', () => {
    it('reads the drawn elements again when a text measures itself again (Controle on phone and desktop)', async () => {
        const edition = updateElement(sampleEdition(), 'space.01', {
            name: 'Dorpsstraat',
        }).edition;
        const { container } = render(<Count edition={edition} />);

        await waitFor(() =>
            expect(
                container.querySelector('[data-probe-key="space.01"]'),
            ).not.toBeNull(),
        );
        expect(screen.getByRole('status').textContent).not.toContain(
            'text.too-long',
        );

        // A web font loads after the first read: the text measures again inside the element, which
        // does not render the probe again.
        const text = container.querySelector<HTMLElement>(
            '[data-probe-key="space.01"] [data-fits]',
        );
        act(() => {
            text?.setAttribute('data-fits', 'false');
            text?.setAttribute('data-overflow-chars', '4');
        });

        await waitFor(() =>
            expect(screen.getByRole('status').textContent).toContain(
                'text.too-long:space.01',
            ),
        );
    });
});
