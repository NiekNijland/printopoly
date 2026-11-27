import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { stubFetch } from '@/testing/fetch';
import { renderWithI18n } from '@/testing/render';

import {
    canShareFiles,
    ShareSetButton,
    type ShareFile,
} from './share-set-button';

type Share = (data: ShareData) => Promise<void>;

const setNavigator = (name: 'share' | 'canShare', value: unknown): void => {
    Object.defineProperty(navigator, name, { configurable: true, value });
};

const files: ShareFile[] = [
    { url: '/print/board.pdf', name: 'bord.pdf' },
    { url: '/print/invite.png', name: 'uitnodiging.png', type: 'image/png' },
];

const pdfAnswer = () =>
    stubFetch(() => new Response(new Blob(['%PDF']), { status: 200 }));

describe('canShareFiles', () => {
    afterEach(() => {
        setNavigator('canShare', undefined);
    });

    it('is false in a browser without Web Share', () => {
        setNavigator('canShare', undefined);

        expect(canShareFiles()).toBe(false);
    });

    it('asks the browser whether it can share a PDF', () => {
        const canShare = vi.fn<(data: ShareData) => boolean>(() => true);
        setNavigator('canShare', canShare);

        expect(canShareFiles()).toBe(true);
        expect(canShare.mock.calls[0]?.[0].files?.[0]?.type).toBe(
            'application/pdf',
        );
    });

    it('is false when asking fails', () => {
        setNavigator('canShare', () => {
            throw new Error('nope');
        });

        expect(canShareFiles()).toBe(false);
    });
});

describe('ShareSetButton', () => {
    afterEach(() => {
        setNavigator('share', undefined);
    });

    it('fetches every file and hands them to the share sheet', async () => {
        const user = userEvent.setup();
        pdfAnswer();
        const share = vi.fn<Share>(() => Promise.resolve());
        setNavigator('share', share);
        renderWithI18n(<ShareSetButton files={files} title="Zaterdagclub" />);

        await user.click(screen.getByRole('button', { name: 'Alles delen' }));

        await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
        const shared = share.mock.calls[0]?.[0];
        expect(shared?.title).toBe('Zaterdagclub');
        expect(shared?.files?.map((file) => [file.name, file.type])).toEqual([
            ['bord.pdf', 'application/pdf'],
            ['uitnodiging.png', 'image/png'],
        ]);
        expect(
            screen.getByRole('button', { name: 'Alles delen' }),
        ).toBeEnabled();
    });

    it('shows that it fetches, with a short label for the screen reader only', async () => {
        const user = userEvent.setup();
        stubFetch(() => new Promise<Response>(() => undefined));
        renderWithI18n(<ShareSetButton files={files} title="Club" short />);

        await user.click(screen.getByRole('button', { name: 'Delen' }));

        const button = screen.getByRole('button', {
            name: 'Bestanden ophalen…',
        });
        expect(button).toBeDisabled();
        expect(screen.getByText('Bestanden ophalen…')).toHaveClass('sr-only');
    });

    it('asks for one more tap when the phone no longer counts the first', async () => {
        const user = userEvent.setup();
        const fake = pdfAnswer();
        const share = vi
            .fn<Share>()
            .mockRejectedValueOnce(new DOMException('late', 'NotAllowedError'))
            .mockResolvedValue(undefined);
        setNavigator('share', share);
        renderWithI18n(<ShareSetButton files={files} title="Club" />);

        await user.click(screen.getByRole('button', { name: 'Alles delen' }));
        await user.click(
            await screen.findByRole('button', { name: 'Nu delen' }),
        );

        await waitFor(() => expect(share).toHaveBeenCalledTimes(2));
        expect(fake).toHaveBeenCalledTimes(2);
        expect(share.mock.calls[1]?.[0].files).toHaveLength(2);
        expect(
            await screen.findByRole('button', { name: 'Alles delen' }),
        ).toBeInTheDocument();
    });

    it('says nothing when the share sheet is closed', async () => {
        const user = userEvent.setup();
        pdfAnswer();
        setNavigator(
            'share',
            vi.fn<Share>(() =>
                Promise.reject(new DOMException('closed', 'AbortError')),
            ),
        );
        renderWithI18n(<ShareSetButton files={files} title="Club" />);

        await user.click(screen.getByRole('button', { name: 'Alles delen' }));

        expect(
            await screen.findByRole('button', { name: 'Alles delen' }),
        ).toBeEnabled();
    });

    it('offers to try again when sharing or fetching fails', async () => {
        const user = userEvent.setup();
        pdfAnswer();
        setNavigator(
            'share',
            vi.fn<Share>(() => Promise.reject(new Error('broken'))),
        );
        renderWithI18n(<ShareSetButton files={files} title="Club" />);

        await user.click(screen.getByRole('button', { name: 'Alles delen' }));

        expect(
            await screen.findByRole('button', { name: 'Opnieuw delen' }),
        ).toBeEnabled();
    });

    it('fails when a file cannot be fetched, with the short label on a small phone', async () => {
        const user = userEvent.setup();
        stubFetch(() => new Response(null, { status: 404 }));
        const share = vi.fn<Share>();
        setNavigator('share', share);
        renderWithI18n(<ShareSetButton files={files} title="Club" short />);

        await user.click(screen.getByRole('button', { name: 'Delen' }));

        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Delen' })).toBeEnabled(),
        );
        expect(share).not.toHaveBeenCalled();
    });

    it('takes its own name and is off without files', () => {
        renderWithI18n(
            <ShareSetButton
                files={[]}
                title="Club"
                variant="secondary"
                label="Plaatje delen: Uitnodiging"
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Plaatje delen: Uitnodiging' }),
        ).toBeDisabled();
    });
});
