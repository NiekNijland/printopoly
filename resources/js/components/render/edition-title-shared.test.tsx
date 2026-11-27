import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
    TiltedPlate,
    scaleToFit,
    taglineOf,
    turnedAspect,
    useShownName,
} from './edition-title-shared';

const ShownName = ({ upper }: { upper: boolean }) => (
    <>{useShownName('ijsbaan', upper)}</>
);

describe('what the title styles share', () => {
    it('fits a photo in a box without cropping it, turned a quarter when asked', () => {
        expect(scaleToFit(2, 100, 40)).toEqual({ w: 80, h: 40 });
        expect(turnedAspect(2, 90)).toBe(0.5);
        expect(turnedAspect(2, 180)).toBe(2);
    });

    it('drops an empty tagline and sets a name in capitals on request', () => {
        expect(taglineOf('  ')).toBeNull();
        expect(taglineOf('Sinds 1987')).toBe('Sinds 1987');
        expect(render(<ShownName upper />).container.textContent).toBe(
            'IJSBAAN',
        );
        expect(render(<ShownName upper={false} />).container.textContent).toBe(
            'ijsbaan',
        );
    });
});

describe('TiltedPlate', () => {
    it('places a title plate, turned about its centre', () => {
        const { container } = render(
            <TiltedPlate
                layout={{
                    plateX: 1,
                    plateY: 2,
                    plateW: 30,
                    plateH: 10,
                    tilt: -2,
                }}
                titleStyle="stamp"
            >
                <span data-slot="plate-inside" />
            </TiltedPlate>,
        );
        const plate = container.querySelector<HTMLElement>(
            '[data-slot="edition-plate"]',
        );

        expect(plate?.getAttribute('data-title-style')).toBe('stamp');
        expect(plate?.style.transform).toBe('rotate(-2deg)');
        expect(plate?.style.transformOrigin).toBe('center');
        expect(plate?.style.width).toBe('30mm');
        expect(
            plate?.querySelector('[data-slot="plate-inside"]'),
        ).not.toBeNull();
    });
});
