import { render } from '@testing-library/react';

import { standardEdition } from '@/lib/render/standard-edition';

import { ModernBand, ModernCorners, OffsetBlock } from './box-lid-look-modern';

describe('the Modern pieces of a lid', () => {
    it('draws two discs, a band of street colours and an offset block', () => {
        const { container } = render(
            <>
                <ModernCorners w={200} h={260} bleed={3} />
                <ModernBand y={250} w={200} h={260} bleed={3} />
                <OffsetBlock rect={{ x: 10, y: 20, w: 100, h: 100 }} />
            </>,
        );

        expect(
            container.querySelectorAll('[data-slot="lid-discs"] circle'),
        ).toHaveLength(2);
        expect(
            container.querySelector('[data-slot="lid-strip"]')?.children,
        ).toHaveLength(standardEdition.groups.length);
        expect(
            container.querySelector('[data-slot="offset-block"]'),
        ).not.toBeNull();
    });
});
