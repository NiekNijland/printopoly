import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import type { FreeLayer } from '@/lib/render/edition-types';
import { photo } from '@/testing/edition-test-utils';
import { renderWithI18n } from '@/testing/render';

import { LayerControls } from './layer-controls';

const text: FreeLayer = {
    id: 'layer-1',
    kind: 'text',
    text: 'Hoi',
    x: 10,
    y: 10,
    w: 60,
    h: 12,
};
const picture: FreeLayer = {
    id: 'layer-2',
    kind: 'photo',
    photo: photo('p9'),
    x: 10,
    y: 40,
    w: 40,
    h: 30,
};

const setup = (start: FreeLayer) => {
    let current = start;
    const groups: string[] = [];
    const Harness = () => {
        const [layer, setLayer] = useState(start);

        return (
            <LayerControls
                selected={layer}
                area={{ w: 200, h: 200 }}
                ink="#1B1F24"
                change={(next, group) => {
                    current = next;
                    groups.push(group);
                    setLayer(next);
                }}
            />
        );
    };
    renderWithI18n(<Harness />);

    return { layerOf: () => current, groups };
};

describe('LayerControls', () => {
    it('shows nothing without a chosen layer', () => {
        const { container } = render(
            <LayerControls
                selected={undefined}
                area={{ w: 200, h: 200 }}
                ink="#1B1F24"
                change={vi.fn()}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('changes the text, letter, alignment and colour of a text layer', async () => {
        const { layerOf } = setup(text);

        fireEvent.change(screen.getByRole('textbox'), {
            target: { value: 'Hallo' },
        });
        await userEvent.click(
            screen.getByRole('radio', { name: 'Typemachine' }),
        );
        await userEvent.click(screen.getByRole('radio', { name: 'Links' }));
        fireEvent.change(screen.getByLabelText('Kleur'), {
            target: { value: '#ff0000' },
        });

        expect(layerOf()).toMatchObject({
            text: 'Hallo',
            font: 'mono',
            align: 'left',
            color: '#FF0000',
        });
        expect(screen.getByText('#FF0000')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('radio', { name: 'Kop' }));
        await userEvent.click(screen.getByRole('radio', { name: 'Midden' }));
        await userEvent.click(
            screen.getByRole('button', {
                name: 'Kleur terug naar standaard',
            }),
        );

        expect(layerOf()).toEqual({ ...text, text: 'Hallo' });
        expect(screen.getByText('#1B1F24')).toBeInTheDocument();
    });

    it('sizes and turns a layer with the sliders and makes a photo grey', async () => {
        const { layerOf } = setup(picture);
        const [size, turn] = screen.getAllByRole('slider');

        fireEvent.keyDown(size ?? document.body, { key: 'ArrowRight' });
        fireEvent.keyDown(turn ?? document.body, { key: 'ArrowLeft' });
        await userEvent.click(
            screen.getByRole('checkbox', { name: 'Zwart-wit' }),
        );

        expect(layerOf()).toMatchObject({
            w: 41,
            rotation: -1,
            photo: { grayscale: true },
        });
    });
});
