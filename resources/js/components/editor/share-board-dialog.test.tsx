import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { ShareBoardDialog } from './share-board-dialog';

describe('ShareBoardDialog (B202)', () => {
    afterEach(() => vi.unstubAllGlobals());

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
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve(answers.shift())),
        );
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
        const fetch = vi.fn(() => Promise.resolve(answers.shift()));
        vi.stubGlobal('fetch', fetch);

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
});
