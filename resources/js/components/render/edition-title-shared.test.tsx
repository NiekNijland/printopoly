import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
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
