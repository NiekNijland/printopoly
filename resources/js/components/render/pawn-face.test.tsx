import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PawnFace } from './pawn-face';

describe('PawnFace', () => {
    it('shows the initial and the name without a photo', () => {
        const { container } = render(<PawnFace name="Ellen" />);

        expect(container.querySelector('[data-slot="initial"]')).not.toBeNull();
        expect(container.querySelector('[data-slot="name"]')?.textContent).toBe(
            'Ellen',
        );
    });

    it('fills the panel with a full photo and puts the name on a band', () => {
        const { container } = render(
            <PawnFace name="Ellen" photo={{ src: 'a.jpg', style: 'full' }} />,
        );

        expect(
            container.querySelector('[data-slot="name-band"]'),
        ).not.toBeNull();
        expect(container.querySelector('[data-slot="initial"]')).toBeNull();
    });
});
