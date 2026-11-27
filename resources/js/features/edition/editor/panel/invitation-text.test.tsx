import { fireEvent } from '@testing-library/react';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from '../element-panel';

const field = (container: HTMLElement, name: string): HTMLInputElement => {
    const node = container.querySelector<HTMLInputElement>(
        `[data-field="${name}"]`,
    );
    if (node === null) {
        throw new Error(`no field ${name}`);
    }

    return node;
};

describe('InvitationText', () => {
    it('writes the kicker, the headline and the text of the invitation', async () => {
        const { props, session } = await setup('invitation');
        const { container } = renderWithI18n(<ElementPanel {...props} />);

        fireEvent.change(field(container, 'subtitle'), {
            target: { value: 'Kom spelen' },
        });
        fireEvent.change(field(container, 'name'), {
            target: { value: 'Spelavond' },
        });
        fireEvent.change(field(container, 'text'), {
            target: { value: 'Vrijdag om acht' },
        });

        expect(session.edition.elements.invitation).toMatchObject({
            subtitle: 'Kom spelen',
            name: 'Spelavond',
            text: 'Vrijdag om acht',
        });
    });

    it('shows the headline of the edition, and drops one of spaces', async () => {
        const { props, session } = await setup('invitation', {
            elements: { invitation: { name: 'Spelavond' } },
        });
        const { container } = renderWithI18n(<ElementPanel {...props} />);

        expect(field(container, 'name').value).toBe('Spelavond');

        fireEvent.change(field(container, 'name'), {
            target: { value: '   ' },
        });

        expect(session.edition.elements.invitation?.name).toBeUndefined();
    });
});
