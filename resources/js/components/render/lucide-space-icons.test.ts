import { LUCIDE_CATALOGUE } from '@/lib/render/space-icons';

import { LUCIDE_SPACE_ICONS } from './lucide-space-icons';
import { HOME_ICONS } from './lucide-space-icons-home';
import { LEISURE_ICONS } from './lucide-space-icons-leisure';
import { TOWN_ICONS } from './lucide-space-icons-town';

const PARTS = { TOWN_ICONS, HOME_ICONS, LEISURE_ICONS };

describe('LUCIDE_SPACE_ICONS', () => {
    it.each(Object.entries(PARTS))(
        'keeps every id of %s with the same drawing',
        (_name, part) => {
            for (const [id, drawing] of Object.entries(part)) {
                expect(LUCIDE_SPACE_ICONS[id]).toBe(drawing);
            }
        },
    );

    it('loses no id to a clash between the part maps', () => {
        const total =
            Object.keys(TOWN_ICONS).length +
            Object.keys(HOME_ICONS).length +
            Object.keys(LEISURE_ICONS).length;

        expect(Object.keys(LUCIDE_SPACE_ICONS)).toHaveLength(total);
    });

    it('holds exactly the ids of the catalogue', () => {
        expect(Object.keys(LUCIDE_SPACE_ICONS).sort()).toEqual(
            LUCIDE_CATALOGUE.map((entry) => entry.id).sort(),
        );
    });

    it('holds no id outside the three part maps', () => {
        for (const id of Object.keys(LUCIDE_SPACE_ICONS)) {
            expect(
                id in TOWN_ICONS || id in HOME_ICONS || id in LEISURE_ICONS,
            ).toBe(true);
        }
    });
});
