import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { fakeIngest } from '@/testing/ingest';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from '../element-panel';

describe('UsePhotoUpload', () => {
    it('puts a chosen photo in the element', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');
        const record = {
            id: 'photo-1',
            editionId: 'sample-edition-1',
            blob: new Blob(['x']),
            width: 800,
            height: 600,
            createdAt: 1,
        };

        fakeIngest.ingestPhoto.mockResolvedValue({ ok: true, record });
        renderWithI18n(<ElementPanel {...props} />);
        const input = screen.getByTestId('photo-input');
        await user.upload(
            input,
            new File(['x'], 'strand.jpg', { type: 'image/jpeg' }),
        );

        await waitFor(() =>
            expect(session.edition.elements['space.01']?.photo?.photoId).toBe(
                'photo-1',
            ),
        );
        expect(session.edition.elements['space.01']).toMatchObject({
            photo: { cx: 0.5, cy: 0.5, scale: 1 },
        });
    });

    it('puts a pasted image on the chosen element and says so when the clipboard has none', async () => {
        const { props, session } = await setup('space.01');

        fakeIngest.ingestPhoto.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                record: {
                    id: 'pasted-1',
                    editionId: 'e',
                    blob: new Blob(['x']),
                    width: 8,
                    height: 6,
                    createdAt: 1,
                },
            }),
        );
        renderWithI18n(<ElementPanel {...props} />);

        const paste = (files: File[]): void => {
            const event = new Event('paste', {
                bubbles: true,
                cancelable: true,
            });

            Object.defineProperty(event, 'clipboardData', {
                value: { files },
            });
            document.body.dispatchEvent(event);
        };

        act(() => paste([]));
        expect(
            await screen.findByText(/geen foto op het klembord/),
        ).toBeVisible();

        act(() => paste([new File(['a'], 'image.png', { type: 'image/png' })]));
        await waitFor(() =>
            expect(session.edition.elements['space.01']?.photo?.photoId).toBe(
                'pasted-1',
            ),
        );
    });

    it('leaves a paste inside a text field alone', async () => {
        const { props } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);
        const event = new Event('paste', { bubbles: true, cancelable: true });

        Object.defineProperty(event, 'clipboardData', { value: { files: [] } });
        screen.getByLabelText('Naam').dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
        expect(screen.queryByText(/geen foto op het klembord/)).toBeNull();
    });

    it('shows the error text of the design with the file name in bold', async () => {
        const user = userEvent.setup({ applyAccept: false });
        const { props } = await setup('space.01');

        fakeIngest.ingestPhoto.mockResolvedValue({
            ok: false,
            error: {
                code: 'unsupported-type',
                fileName: 'vakantie.tiff',
                rest: {
                    nl: 'kan niet: kies een JPEG, PNG, WebP of HEIC.',
                    en: "can't be used: choose a JPEG, PNG, WebP or HEIC.",
                },
            },
        });
        renderWithI18n(<ElementPanel {...props} />);
        await user.upload(
            screen.getByTestId('photo-input'),
            new File(['x'], 'vakantie.tiff', { type: 'image/tiff' }),
        );

        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent(
            'vakantie.tiff kan niet: kies een JPEG, PNG, WebP of HEIC.',
        );
        expect(alert.querySelector('strong')).toHaveTextContent(
            'vakantie.tiff',
        );
    });

    it('tells when the browser storage is full', async () => {
        const user = userEvent.setup();
        const { props } = await setup('space.01');

        fakeIngest.ingestPhoto.mockResolvedValue({
            ok: false,
            storageFull: true,
            fileName: 'strand.jpg',
        });
        renderWithI18n(<ElementPanel {...props} />);
        await user.upload(
            screen.getByTestId('photo-input'),
            new File(['x'], 'strand.jpg', { type: 'image/jpeg' }),
        );

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'past niet meer in de opslag van deze browser',
        );
        await act(() => Promise.resolve());
    });

    it('drops an upload error when a new file is chosen and when another element is shown', async () => {
        const user = userEvent.setup({ applyAccept: false });
        const { props } = await setup('space.01');

        fakeIngest.ingestPhoto.mockResolvedValueOnce({
            ok: false,
            error: {
                code: 'unsupported-type',
                fileName: 'vakantie.tiff',
                rest: { nl: 'kan niet.', en: "can't be used." },
            },
        });
        const Switcher = () => {
            const [key, setKey] = useState('space.01');

            return (
                <>
                    <button type="button" onClick={() => setKey('space.03')}>
                        volgende
                    </button>
                    <ElementPanel {...props} editKey={key} />
                </>
            );
        };
        renderWithI18n(<Switcher />);
        await user.upload(
            screen.getByTestId('photo-input'),
            new File(['x'], 'vakantie.tiff', { type: 'image/tiff' }),
        );
        expect(await screen.findByRole('alert')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'volgende' }));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
