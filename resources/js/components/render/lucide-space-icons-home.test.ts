import { LUCIDE_CATALOGUE } from '@/lib/render/space-icons';

import { HOME_ICONS } from './lucide-space-icons-home';

const CATEGORIES: readonly string[] = ['home', 'school', 'food'];

describe('HOME_ICONS', () => {
    it('draws every catalogue icon whose first category is home, school, food', () => {
        const ids = LUCIDE_CATALOGUE.filter((entry) =>
            CATEGORIES.includes(entry.categories[0] ?? ''),
        ).map((entry) => entry.id);

        expect(Object.keys(HOME_ICONS).sort()).toEqual([...ids].sort());
    });

    it('holds a lucide drawing for each id', () => {
        for (const drawing of Object.values(HOME_ICONS)) {
            expect(drawing).toHaveProperty('render');
        }
    });
});
