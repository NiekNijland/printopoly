import { render, screen, waitFor } from '@testing-library/react';

import { ShareImage, type SharePayload } from './share-image';

const placement = {
    photoId: 'p1',
    cx: 0.5,
    cy: 0.5,
    scale: 1,
    rotation: 0,
    grayscale: false,
};

const payload = (overrides: Partial<SharePayload> = {}): SharePayload => ({
    part: 'share',
    set: 'printer',
    pageShaveMm: 0.5,
    labels: { kicker: 'Onze eigen editie', footer: 'printopoly.nl' },
    edition: {
        name: 'Buurtfeest',
        language: 'nl',
        elements: {
            'space.01': {
                name: 'Beukenlaan',
                photo: placement,
            },
        },
    },
    photos: [
        { id: 'p1', src: 'data:image/jpeg;base64,AAAA', width: 40, height: 30 },
    ],
    ...overrides,
});

describe('ShareImage', () => {
    beforeEach(() => {
        Object.defineProperty(document, 'fonts', {
            configurable: true,
            value: { ready: Promise.resolve() },
        });
    });

    it('lays the board of the edition, with its names and photos, under the label and above the address', async () => {
        const { container } = render(<ShareImage payload={payload()} />);

        const page = container.querySelector('[data-share-image]');
        expect(page).toHaveStyle({ width: '1080px' });
        expect(page instanceof HTMLElement ? page.style.height : '').toBe(
            'calc(1080px - 0.5mm)',
        );
        expect(screen.getByText('Onze eigen editie')).toBeInTheDocument();
        expect(screen.getByText('printopoly.nl')).toHaveStyle({
            bottom: '22px',
        });
        expect(page).toHaveTextContent('Beukenlaan');
        expect(page).toHaveTextContent('Buurtfeest');
        expect(
            [...container.querySelectorAll('image, img')].some(
                (image) =>
                    (image.getAttribute('href') ??
                        image.getAttribute('src')) ===
                    'data:image/jpeg;base64,AAAA',
            ),
        ).toBe(true);
        await waitFor(() => expect(window.printReady).toBe(true));
    });

    it('draws a board without photos too', () => {
        const { container } = render(
            <ShareImage payload={payload({ photos: undefined })} />,
        );

        expect(container.querySelector('[data-share-image]')).toHaveTextContent(
            'Beukenlaan',
        );
    });
});
