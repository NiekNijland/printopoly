import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { layerOnFold } from '@/lib/render/editor-layer-fold';
import { photo } from '@/testing/edition-test-utils';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from '../element-panel';

describe('StyleSection', () => {
    it('sets the colour of a note and points to the bank name in the edition (B85, B148)', async () => {
        const { props, session } = await setup('note.100');

        renderWithI18n(<ElementPanel {...props} />);
        fireEvent.change(screen.getByLabelText('Kleur'), {
            target: { value: '#aabbcc' },
        });
        expect(session.edition.elements['note.100']?.color).toBe('#aabbcc');
        expect(screen.queryByLabelText('Naam van de bank')).toBeNull();
        expect(
            screen.getByText('onder Woorden', { exact: false }),
        ).toBeInTheDocument();
        expect(
            screen.getAllByText('vast', { exact: false }).length,
        ).toBeGreaterThan(0);
    });

    it('adds a text layer on the board centre and lists it with the title', async () => {
        const user = userEvent.setup();
        const onSelectLayer = vi.fn();
        const { props, session } = await setup('board_center');

        renderWithI18n(
            <ElementPanel
                {...props}
                area={{ w: 360, h: 360 }}
                onSelectLayer={onSelectLayer}
            />,
        );
        expect(screen.getByText('Titel: Zaterdagclub')).toBeInTheDocument();
        // The two add buttons share a row of the narrow panel and may shrink (no overflow at 1440 px).
        expect(
            screen.getByRole('button', { name: 'Extra foto erop' }),
        ).toHaveClass('flex-1', 'basis-36');
        await user.click(
            screen.getByRole('button', { name: 'Tekst toevoegen' }),
        );

        const layers = session.edition.elements['board_center']?.layers ?? [];
        expect(layers).toHaveLength(1);
        expect(layers[0]).toMatchObject({ kind: 'text', id: 'layer-1' });
        // A new layer starts in a free square, never on the fold lines (B183, B187).
        expect(
            layers.some((layer) =>
                layerOnFold(layer, session.edition.boardProfile),
            ),
        ).toBe(false);
        expect(onSelectLayer).toHaveBeenCalledWith('layer-1');
    });

    it('shows a photo layer in the list as a small preview of the photo (R5-07)', async () => {
        const { props } = await setup('board_center', {
            elements: {
                board_center: {
                    layers: [
                        {
                            id: 'layer-1',
                            kind: 'photo',
                            photo: photo('p9'),
                            x: 10,
                            y: 10,
                            w: 40,
                            h: 30,
                        },
                    ],
                },
            },
        });

        renderWithI18n(
            <ElementPanel
                {...props}
                area={{ w: 360, h: 360 }}
                selectedLayer="layer-1"
            />,
        );
        const row = document.querySelector('[data-layer-row="photo"]');
        expect(row?.querySelector('[data-layer-preview]')).not.toBeNull();
        expect(row).toHaveTextContent('Foto');
        expect(row).not.toHaveTextContent('gekozen');
    });
});
