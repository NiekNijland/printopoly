import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useSyncExternalStore, type RefObject } from 'react';

import { EditionSession } from '@/features/edition/session';
import type { Edition } from '@/lib/render/edition-types';
import { PhotoCache } from '@/lib/render/editor-photo-cache';
import {
    makeBus,
    makeEdition,
    ManualScheduler,
} from '@/testing/edition-test-utils';
import { installMemoryServices } from '@/testing/editions';
import { pngHeader } from '@/testing/photos-test-fixtures';
import { renderWithI18n } from '@/testing/render';

import { CenterBackground } from './center-background';

const KEY = 'board_center';

const stubImages = (): void => {
    vi.stubGlobal(
        'createImageBitmap',
        vi.fn(() =>
            Promise.resolve({
                width: 4000,
                height: 3000,
                close: () => undefined,
            }),
        ),
    );
    vi.stubGlobal(
        'OffscreenCanvas',
        class {
            getContext() {
                return { drawImage: () => undefined };
            }
            convertToBlob() {
                return Promise.resolve(new Blob(['webp']));
            }
        },
    );
};

type Options = {
    fieldOnly?: boolean;
    inputRef?: RefObject<HTMLInputElement | null>;
};

const Harness = ({
    session,
    cache,
    options,
}: {
    session: EditionSession;
    cache: PhotoCache;
    options: Options;
}) => {
    const edition = useSyncExternalStore(
        (listener) => session.subscribe(listener),
        () => session.edition,
    );

    return (
        <CenterBackground
            session={session}
            edition={edition}
            editKey={KEY}
            override={edition.elements[KEY]}
            cache={cache}
            locale="nl"
            {...options}
        />
    );
};

const mount = (edition: Edition = makeEdition(), options: Options = {}) => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:photo');
    const services = installMemoryServices();
    const session = new EditionSession(edition, {
        storage: services.storage,
        bus: makeBus(null, 'w1'),
        now: () => 1_000,
        scheduler: new ManualScheduler(),
    });
    const cache = new PhotoCache((id) => services.repository.getPhoto(id));
    renderWithI18n(
        <Harness session={session} cache={cache} options={options} />,
    );

    return { session, services };
};

const choose = (file: File): void => {
    fireEvent.change(screen.getByTestId('background-input'), {
        target: { files: [file] },
    });
};

const png = (): File =>
    new File([new Uint8Array(pngHeader(4000, 3000))], 'feest.png');

describe('CenterBackground', () => {
    it('offers to choose a photo over the whole centre', async () => {
        const user = userEvent.setup();
        mount();
        const click = vi.spyOn(HTMLInputElement.prototype, 'click');

        await user.click(screen.getByRole('button', { name: 'Foto kiezen' }));

        expect(click).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('slider')).toBeNull();
    });

    it('puts a chosen photo over the centre in place of the one above the name, with tools to place it', async () => {
        stubImages();
        const edition = makeEdition();
        edition.elements[KEY] = { centerMode: 'photo' };
        const { session } = mount(edition);

        choose(png());

        await screen.findByRole('button', { name: 'Andere foto' });
        const element = session.edition.elements[KEY];
        expect(element?.centerMode).toBeUndefined();
        expect(element?.photo).toBeUndefined();
        expect(element?.background?.photoId).toMatch(/test-edition$/);
        expect(screen.getByRole('slider')).toBeEnabled();
        expect(screen.getByTestId('photo-resolution')).toHaveTextContent(
            /\(ongeveer \d+ ppi\)/,
        );
    });

    it('zooms and moves the photo in one undo step per gesture', async () => {
        stubImages();
        const user = userEvent.setup();
        const { session } = mount();
        choose(png());
        await screen.findByRole('button', { name: 'Andere foto' });
        const before = session.edition.elements[KEY]?.background;

        await user.click(screen.getByRole('button', { name: 'rechts' }));
        const moved = session.edition.elements[KEY]?.background;
        expect(moved?.cx).not.toBe(before?.cx);

        screen.getByRole('slider').focus();
        await user.keyboard('{ArrowRight}');
        expect(
            session.edition.elements[KEY]?.background?.scale,
        ).toBeGreaterThan(moved?.scale ?? 0);
    });

    it('cannot place a photo it has not read yet', async () => {
        const user = userEvent.setup();
        const edition = makeEdition();
        edition.elements[KEY] = {
            background: {
                photoId: 'elsewhere',
                cx: 0.5,
                cy: 0.5,
                scale: 1.2,
                rotation: 0,
                grayscale: false,
            },
        };
        const { session } = mount(edition);

        screen.getByRole('slider').focus();
        await user.keyboard('{ArrowRight}');
        expect(session.canUndo).toBe(false);
        expect(screen.getByRole('button', { name: 'links' })).toBeDisabled();
        expect(screen.getByText('120%')).toBeInTheDocument();
        expect(screen.queryByTestId('photo-resolution')).toBeNull();
    });

    it('says why a file cannot be used', async () => {
        mount();

        choose(new File(['hello'], 'notes.txt'));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'notes.txt kan niet: kies een JPEG, PNG, WebP of HEIC.',
        );
    });

    it('says when the photo does not fit in the storage', async () => {
        stubImages();
        const { services } = mount();
        const full = new Error('full');
        full.name = 'QuotaExceededError';
        vi.spyOn(services.storage, 'putPhoto').mockRejectedValue(full);

        choose(png());

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'feest.png past niet meer in de opslag van deze browser.',
        );
    });

    it('keeps only the file field for another layout, on the given ref, and ignores an empty choice', async () => {
        const inputRef = createRef<HTMLInputElement>();
        const { session } = mount(makeEdition(), { fieldOnly: true, inputRef });

        expect(screen.queryByRole('button')).toBeNull();
        expect(inputRef.current).toBe(screen.getByTestId('background-input'));
        fireEvent.change(screen.getByTestId('background-input'), {
            target: { files: [] },
        });

        await waitFor(() => expect(session.canUndo).toBe(false));
        expect(screen.queryByRole('alert')).toBeNull();
    });
});
