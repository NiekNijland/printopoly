import { render } from '@testing-library/react';

import { standardEdition } from '@/lib/render/standard-edition';
import { THEMES } from '@/lib/render/themes';

import { useStreetColors, vintageLid } from './box-lid-colors';
import { Sheet } from './sheet';

const Colors = () => <span data-colors={useStreetColors().join(',')} />;

describe('the colours of a lid', () => {
    it('warms the lid colour of the theme for Vintage', () => {
        expect(vintageLid(THEMES.classic)).toMatch(/^#/);
        expect(vintageLid(THEMES.classic)).not.toBe(
            THEMES.classic.boardBackground,
        );
    });

    it('takes the street colours of the edition before the standard ones', () => {
        const { container } = render(
            <Sheet
                element="test"
                theme="classic"
                locale="nl"
                widthMm={10}
                heightMm={10}
                background="#fff"
                style={{ groupColors: { brown: '#123456' } }}
            >
                <Colors />
            </Sheet>,
        );
        const colors = container
            .querySelector('[data-colors]')
            ?.getAttribute('data-colors')
            ?.split(',');

        expect(colors).toHaveLength(standardEdition.groups.length);
        expect(colors).toContain('#123456');
    });
});
