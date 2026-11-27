import { render } from '@testing-library/react';

import { VintageBorder } from './box-lid-look-vintage';

describe('VintageBorder', () => {
    it('draws a rope border with a rosette box in each corner and a lozenge on each side', () => {
        const { container } = render(<VintageBorder w={200} h={260} />);

        expect(
            container.querySelectorAll('[data-slot="lid-corner"]'),
        ).toHaveLength(4);
        expect(
            container.querySelector('[data-slot="lid-border"]'),
        ).not.toBeNull();
        expect(
            container.querySelectorAll('[data-slot="lid-border"] > g > path'),
        ).toHaveLength(12);
    });
});
