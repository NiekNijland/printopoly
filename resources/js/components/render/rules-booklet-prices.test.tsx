import { render } from '@testing-library/react';

import { DEFAULT_WORDS } from '@/lib/render/rules-booklet';
import { priceList } from '@/lib/render/rules-booklet-prices';
import { THEMES } from '@/lib/render/themes';

import { PriceTable } from './rules-booklet-prices';

const content = priceList(
    {
        locale: 'nl',
        currency: 'eur',
        name: 'Ons Dorp',
        words: DEFAULT_WORDS.nl,
        spaceNames: [],
        houseRules: [],
    },
    'Hoofdstuk 11',
    'Prijzen',
    ['brown', 'station'],
    'Een noot',
);

describe('PriceTable', () => {
    it('lists a row per street and station under its group, with the note', () => {
        const { container } = render(
            <PriceTable content={content} theme={THEMES.classic} />,
        );

        expect(container.querySelectorAll('[data-price-name]')).toHaveLength(6);
        expect(container.textContent).toContain('Een noot');
        expect(container.textContent).toContain('Stations');
    });

    it('lets a long street name take a smaller letter instead of being cut', () => {
        const long = {
            ...content,
            groups: content.groups.map((group) => ({
                ...group,
                rows: group.rows.map((row) => ({
                    ...row,
                    name: 'De burgemeester van der Veldenweg',
                })),
            })),
        };
        const { container } = render(
            <PriceTable content={long} theme={THEMES.classic} />,
        );

        expect(
            container.querySelector('[data-price-name]')?.getAttribute('style'),
        ).toContain('font-size: 2.4mm');
    });
});
