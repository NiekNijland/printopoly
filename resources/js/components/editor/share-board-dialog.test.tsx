import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { sampleEdition } from '@/testing/editions';
import { inOrder, stubFetch } from '@/testing/fetch';
import { renderWithI18n } from '@/testing/render';

import { ShareBoardDialog } from './share-board-dialog';

describe('ShareBoardDialog (B202)', () => {
    it('makes the picture as soon as it opens, and offers to save it', async () => {
        const answers = [
            new Response(JSON.stringify({ id: 'x'.repeat(40) }), {
                status: 202,
            }),
            new Response(new Blob(['png'], { type: 'image/png' }), {
                status: 200,
                headers: { 'Content-Type': 'image/png' },
            }),
        ];
        const fetch = stubFetch(inOrder(answers));
        vi.stubGlobal('URL', {
            ...URL,
            createObjectURL: () => 'blob:board',
            revokeObjectURL: () => undefined,
        });

        renderWithI18n(
            <ShareBoardDialog
                open
                onOpenChange={vi.fn()}
                edition={sampleEdition()}
            />,
        );

        expect(
            screen.getByRole('dialog', { name: 'Deel je bord' }),
        ).toBeInTheDocument();
        expect(
            await screen.findByRole(
                'link',
                { name: 'Bewaar plaatje' },
                { timeout: 3000 },
            ),
        ).toHaveAttribute('href', 'blob:board');

        // The whole edition goes along, with its own words, not only the names (R5-24).
        const body = JSON.parse(fetch.mock.calls[0]?.[1]?.body as string) as {
            edition: { id: string; elements: object };
            photos: unknown[];
        };
        expect(body.edition.id).toBe('sample-edition-1');
        expect(body.photos).toEqual([]);
    });

    it('says when the picture failed and tries again on request', async () => {
        const answers = [
            new Response(JSON.stringify({ id: 'x'.repeat(40) }), {
                status: 202,
            }),
            new Response(
                JSON.stringify({ status: 'failed', message: 'Mis.' }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                },
            ),
            new Response(JSON.stringify({ id: 'y'.repeat(40) }), {
                status: 202,
            }),
        ];
        const fetch = stubFetch(inOrder(answers));

        renderWithI18n(
            <ShareBoardDialog
                open
                onOpenChange={vi.fn()}
                edition={sampleEdition()}
            />,
        );

        expect(
            await screen.findByText(
                'Het plaatje maken lukte niet. Probeer het zo nog eens.',
                {},
                { timeout: 3000 },
            ),
        ).toBeInTheDocument();
        await userEvent
            .setup()
            .click(screen.getByRole('button', { name: 'Opnieuw proberen' }));
        expect(
            screen.queryByText(
                'Het plaatje maken lukte niet. Probeer het zo nog eens.',
            ),
        ).not.toBeInTheDocument();
        expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('stops asking for the picture once the dialog is gone', async () => {
        vi.useFakeTimers();
        const fetch = stubFetch((url) =>
            url.endsWith('/api/share-image')
                ? new Response(JSON.stringify({ id: 'z'.repeat(40) }), {
                      status: 202,
                  })
                : new Response(JSON.stringify({ status: 'busy' }), {
                      headers: { 'Content-Type': 'application/json' },
                  }),
        );
        const view = renderWithI18n(
            <ShareBoardDialog
                open
                onOpenChange={vi.fn()}
                edition={sampleEdition()}
            />,
        );
        await act(() => vi.advanceTimersByTimeAsync(2500));
        const asked = fetch.mock.calls.length;
        expect(asked).toBeGreaterThan(1);

        view.unmount();
        await act(() => vi.advanceTimersByTimeAsync(5000));

        expect(fetch).toHaveBeenCalledTimes(asked);
    });
});
