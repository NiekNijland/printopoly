import { screen } from '@testing-library/react';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { spaceOfKey } from '@/lib/render/editor-panel-sections';
import type { PanelSection } from '@/lib/render/editor-panel-sections';
import { photo } from '@/testing/edition-test-utils';
import { renderWithI18n } from '@/testing/render';

import type { Placed } from './place-photo';
import { SectionBody } from './section-body';
import type { PhotoUpload } from './use-photo-upload';

const upload = (placed: Placed | null = null): PhotoUpload => ({
    uploads: [],
    placed,
    undoPlaced: vi.fn(),
    dismissPlaced: vi.fn(),
    movePlaced: vi.fn(),
    placeMissed: vi.fn(() => Promise.resolve()),
    assign: vi.fn(() => Promise.resolve()),
    dragging: false,
    canPasteButton: false,
    choose: vi.fn(),
    paste: vi.fn(() => Promise.resolve()),
    dropProps: { onDragOver: vi.fn(), onDragLeave: vi.fn(), onDrop: vi.fn() },
});

const body = async (
    id: PanelSection,
    key: string,
    kind: 'space' | 'note',
    placed: Placed | null = null,
) => {
    const { props } = await setup(key);

    return renderWithI18n(
        <SectionBody
            {...props}
            id={id}
            kind={kind}
            space={spaceOfKey(key)}
            iconSpace={undefined}
            card={undefined}
            own={[]}
            photoStyle={false}
            upload={upload(placed)}
            announce={vi.fn()}
            selectedLayer={null}
        />,
    );
};

describe('SectionBody', () => {
    it('shows the fields of the section it is', async () => {
        const text = await body('text', 'space.01', 'space');

        expect(
            text.container.querySelector('[data-field="name"]'),
        ).not.toBeNull();
        text.unmount();

        const style = await body('style', 'note.100', 'note');

        expect(
            style.container.querySelector('input[type="color"]'),
        ).not.toBeNull();
        style.unmount();

        const amounts = await body('amounts', 'note.100', 'note');

        expect(amounts.container).toHaveTextContent(/100/);
    });

    it('puts the list of placed photos under the photo field', async () => {
        Element.prototype.scrollIntoView = vi.fn();
        await body('image', 'space.01', 'space', {
            kind: 'batch',
            items: [
                {
                    key: 'space.01',
                    label: 'Molenweg',
                    file: 'molenweg.jpg',
                    placement: photo(),
                    how: 'order',
                    replaced: false,
                },
            ],
            missed: [],
            note: '',
            undone: false,
            pool: [{ key: 'space.01', label: 'Molenweg' }],
        });

        expect(screen.getByTestId('photos-placed')).toHaveTextContent(
            'molenweg.jpg',
        );
    });
});
