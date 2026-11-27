import { render } from '@testing-library/react';

import { resolveEdition } from '@/lib/render/edition-resolve';
import { sampleEdition } from '@/testing/editions';

import { FriendArt } from './friend-art';

describe('FriendArt', () => {
    it('lays the board of the edition, with its own names, on the table', () => {
        const edition = sampleEdition();
        edition.elements['space.01'] = { name: 'Beukenlaan' };

        const { container } = render(
            <FriendArt resolved={resolveEdition(edition)} />,
        );

        expect(container.textContent).toContain('Beukenlaan');
        expect(container.textContent).toContain('Zaterdagclub');
    });

    it('shows the printed photo a friend can send, as decoration', () => {
        const { container } = render(
            <FriendArt resolved={resolveEdition(sampleEdition())} />,
        );

        const photo = container.querySelector('svg[viewBox="0 0 134 110"]');
        expect(photo).toHaveAttribute('aria-hidden', 'true');
        expect(photo?.querySelector('circle')).toHaveAttribute(
            'fill',
            '#F6D33C',
        );
    });
});
