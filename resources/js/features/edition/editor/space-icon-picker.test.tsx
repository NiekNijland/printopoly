import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditionSession } from '@/features/edition/session';
import type { Edition } from '@/lib/render/edition-types';
import { PhotoCache } from '@/lib/render/editor-photo-cache';
import { isSpaceIconPreset, spaceIconName } from '@/lib/render/space-icons';
import { spaceAt } from '@/lib/render/standard-edition';
import {
    makeBus,
    makeEdition,
    ManualScheduler,
} from '@/testing/edition-test-utils';
import { installMemoryServices } from '@/testing/editions';
import { pngHeader } from '@/testing/photos-test-fixtures';
import { renderWithI18n } from '@/testing/render';

import {
    IconPresetPicker,
    IconUpload,
    iconChoiceOf,
} from './space-icon-picker';

const open = (edition: Edition = makeEdition()) => {
    const services = installMemoryServices();

    return {
        services,
        session: new EditionSession(edition, {
            storage: services.storage,
            bus: makeBus(null, 'w1'),
            now: () => 1_000,
            scheduler: new ManualScheduler(),
        }),
    };
};

const presetOf = (session: EditionSession, key: string): string | null => {
    const icon = session.edition.elements[key]?.icon;

    return icon !== undefined && 'preset' in icon ? icon.preset : null;
};

describe('iconChoiceOf', () => {
    it('tells the standard icon, another icon and an own image apart', () => {
        expect(iconChoiceOf(undefined)).toBe('standard');
        expect(iconChoiceOf({ preset: 'bulb' })).toBe('preset');
        expect(
            iconChoiceOf({
                aspect: 1,
                photo: {
                    photoId: 'p',
                    cx: 0.5,
                    cy: 0.5,
                    scale: 1,
                    rotation: 0,
                    grayscale: false,
                },
            }),
        ).toBe('upload');
    });
});

describe('IconPresetPicker', () => {
    it('offers eight icons that suit a station and puts the chosen one on the space', async () => {
        const user = userEvent.setup();
        const edition = makeEdition();
        edition.elements['space.05'] = {
            photo: {
                photoId: 'p',
                cx: 0.5,
                cy: 0.5,
                scale: 1,
                rotation: 0,
                grayscale: false,
            },
        };
        const { session } = open(edition);
        renderWithI18n(
            <IconPresetPicker
                session={session}
                edition={edition}
                editKey="space.05"
                space={spaceAt(5)}
            />,
        );

        const group = screen.getByRole('radiogroup', { name: 'Ander icoon' });
        const radios = screen.getAllByRole('radio');
        expect(group).toBeInTheDocument();
        expect(radios).toHaveLength(8);
        const first = radios[0];
        await user.click(first ?? group);

        const preset = presetOf(session, 'space.05');
        expect(
            preset !== null && isSpaceIconPreset(preset)
                ? spaceIconName(preset, 'nl')
                : null,
        ).toBe(first?.getAttribute('title'));
        expect(session.edition.elements['space.05']?.photo).toBeUndefined();
    });

    it('shows a chosen icon from the whole set first in the quick choice', () => {
        const edition = makeEdition();
        edition.elements['space.05'] = { icon: { preset: 'bulb' } };
        const { session } = open(edition);
        renderWithI18n(
            <IconPresetPicker
                session={session}
                edition={edition}
                editKey="space.05"
                space={spaceAt(5)}
            />,
        );

        const radios = screen.getAllByRole('radio');
        expect(radios).toHaveLength(8);
        expect(radios[0]).toHaveAttribute('title', spaceIconName('bulb', 'nl'));
        expect(radios[0]).toBeChecked();
    });

    it('offers nothing for a street', () => {
        const { session } = open();
        const { container } = renderWithI18n(
            <IconPresetPicker
                session={session}
                edition={session.edition}
                editKey="space.01"
                space={spaceAt(1)}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });
});

describe('IconUpload', () => {
    const stubImages = (): void => {
        vi.stubGlobal(
            'createImageBitmap',
            vi.fn(() =>
                Promise.resolve({
                    width: 300,
                    height: 150,
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

    const mount = (edition: Edition = makeEdition()) => {
        const { session, services } = open(edition);
        const cache = new PhotoCache((id) => services.repository.getPhoto(id));
        const added = vi.spyOn(cache, 'add');
        const view = renderWithI18n(
            <IconUpload
                session={session}
                edition={edition}
                editKey="space.05"
                cache={cache}
            />,
        );

        return { session, added, view };
    };

    it('puts an own image on the space instead of the icon, with its shape', async () => {
        stubImages();
        const { session, added } = mount();
        expect(
            screen.getByText(
                'Een PNG met een doorzichtige achtergrond werkt het best.',
            ),
        ).toBeInTheDocument();

        fireEvent.change(screen.getByTestId('icon-input'), {
            target: {
                files: [
                    new File([new Uint8Array(pngHeader(300, 150))], 'logo.png'),
                ],
            },
        });

        await waitFor(() => expect(added).toHaveBeenCalledTimes(1));
        expect(session.edition.elements['space.05']?.icon).toMatchObject({
            aspect: 2,
            photo: { grayscale: false },
        });
    });

    it('says when the image cannot be used', async () => {
        const { session, added } = mount();

        fireEvent.change(screen.getByTestId('icon-input'), {
            target: { files: [new File(['nope'], 'notes.txt')] },
        });

        expect(
            await screen.findByText(
                'Deze afbeelding lukte niet. Probeer een JPEG, PNG, WebP of HEIC.',
            ),
        ).toBeInTheDocument();
        expect(added).not.toHaveBeenCalled();
        expect(session.canUndo).toBe(false);
    });

    it('offers another image when the space has one, and does nothing without a file', () => {
        const edition = makeEdition();
        edition.elements['space.05'] = {
            icon: {
                aspect: 1,
                photo: {
                    photoId: 'p',
                    cx: 0.5,
                    cy: 0.5,
                    scale: 1,
                    rotation: 0,
                    grayscale: false,
                },
            },
        };
        const { session } = mount(edition);

        fireEvent.change(screen.getByTestId('icon-input'), {
            target: { files: [] },
        });

        expect(
            screen.getByRole('button', { name: 'Andere afbeelding' }),
        ).toBeEnabled();
        expect(
            screen.getByText('Je eigen afbeelding staat op het vak.'),
        ).toBeInTheDocument();
        expect(session.canUndo).toBe(false);
    });

    it('opens the file chooser from the button', async () => {
        const user = userEvent.setup();
        mount();
        const click = vi.spyOn(HTMLInputElement.prototype, 'click');

        await user.click(
            screen.getByRole('button', { name: 'Afbeelding kiezen' }),
        );

        expect(click).toHaveBeenCalledTimes(1);
    });
});
