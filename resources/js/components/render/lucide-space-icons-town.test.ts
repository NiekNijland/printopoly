import { LUCIDE_CATALOGUE } from '@/lib/render/space-icons';

import { TOWN_ICONS } from './lucide-space-icons-town';

const CATEGORIES: readonly string[] = ['money', 'post', 'transport', 'energy'];

describe('TOWN_ICONS', () => {
    it('draws every catalogue icon whose first category is money, post, transport, energy', () => {
        const ids = LUCIDE_CATALOGUE.filter((entry) =>
            CATEGORIES.includes(entry.categories[0] ?? ''),
        ).map((entry) => entry.id);

        expect(Object.keys(TOWN_ICONS).sort()).toEqual([...ids].sort());
    });

    it('holds a lucide drawing for each id', () => {
        for (const drawing of Object.values(TOWN_ICONS)) {
            expect(drawing).toHaveProperty('render');
        }
    });
});
