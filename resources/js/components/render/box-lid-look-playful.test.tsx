import { render } from '@testing-library/react';

import { LidConfetti, PlayfulDoily, TapeCorners } from './box-lid-look-playful';

describe('the Speels pieces of a lid', () => {
    it('draws a doily and two strips of tape', () => {
        const { container } = render(
            <>
                <PlayfulDoily w={200} h={260} />
                <TapeCorners w={120} h={120} />
            </>,
        );

        expect(
            container.querySelector('[data-slot="lid-doily"]'),
        ).not.toBeNull();
        expect(container.querySelectorAll('[data-slot="tape"]')).toHaveLength(
            2,
        );
    });

    it('scatters confetti only when the gutters beside the picture are wide enough', () => {
        const wide = render(
            <LidConfetti
                picture={{ x: 50, y: 40, w: 100, h: 100 }}
                w={200}
                h={260}
            />,
        ).container;
        const narrow = render(
            <LidConfetti
                picture={{ x: 25, y: 40, w: 150, h: 100 }}
                w={200}
                h={260}
            />,
        ).container;

        expect(wide.querySelector('[data-slot="confetti"]')).not.toBeNull();
        expect(narrow.innerHTML).toBe('');
    });
});
