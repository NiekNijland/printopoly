import { fireEvent } from '@testing-library/react';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from '../element-panel';

const fields = (container: HTMLElement): (string | undefined)[] =>
    [...container.querySelectorAll<HTMLElement>('[data-field]')]
        .map((node) => node.dataset.field)
        .filter(
            (name) => name === 'name' || name === 'text' || name === 'town',
        );

describe('SpaceText', () => {
    it('gives a street its name and the town of its group', async () => {
        const { props, session } = await setup('space.01');
        const { container } = renderWithI18n(<ElementPanel {...props} />);

        expect(fields(container)).toEqual(['name', 'town']);

        const town = container.querySelector<HTMLInputElement>(
            '[data-field="town"]',
        );
        if (town === null) {
            throw new Error('no town field');
        }
        fireEvent.change(town, { target: { value: 'Ons Dorp' } });

        expect(session.edition.elements['group.brown']?.town).toBe('Ons Dorp');
    });

    it('gives a corner its short text and a deed its story', async () => {
        const corner = await setup('space.00');
        const first = renderWithI18n(<ElementPanel {...corner.props} />);

        expect(fields(first.container)).toEqual(['name', 'text']);
        first.unmount();

        const deed = await setup('deed.01');
        const second = renderWithI18n(<ElementPanel {...deed.props} />);

        expect(fields(second.container)).toEqual(['name', 'text']);
        expect(
            second.container.querySelector('textarea[data-field="text"]'),
        ).not.toBeNull();
    });

    it('writes the short text of a corner and drops it when empty', async () => {
        const { props, session } = await setup('space.00');
        const { container } = renderWithI18n(<ElementPanel {...props} />);
        const text = container.querySelector<HTMLInputElement>(
            'input[data-field="text"]',
        );
        if (text === null) {
            throw new Error('no corner text');
        }

        fireEvent.change(text, { target: { value: 'Vertrek' } });

        expect(session.edition.elements['space.00']?.text).toBe('Vertrek');

        fireEvent.change(text, { target: { value: '' } });

        expect(session.edition.elements['space.00']?.text).toBeUndefined();
    });
});
