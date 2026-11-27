import { LUCIDE_CATALOGUE } from '@/lib/render/space-icons';

import { LEISURE_ICONS } from './lucide-space-icons-leisure';

const CATEGORIES: readonly string[] = ['sport', 'music', 'nature', 'signs'];

describe('LEISURE_ICONS', () => {
    it('draws every catalogue icon whose first category is sport, music, nature, signs', () => {
        const ids = LUCIDE_CATALOGUE.filter((entry) =>
            CATEGORIES.includes(entry.categories[0] ?? ''),
        ).map((entry) => entry.id);

        expect(Object.keys(LEISURE_ICONS).sort()).toEqual([...ids].sort());
    });

    it('holds a lucide drawing for each id', () => {
        for (const drawing of Object.values(LEISURE_ICONS)) {
            expect(drawing).toHaveProperty('render');
        }
    });
});
