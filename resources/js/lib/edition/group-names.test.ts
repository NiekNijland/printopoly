import { GROUP_IDS } from '@/lib/edition/keys';
import { standardEdition } from '@/lib/game/standard-edition';
import { THEMES } from '@/lib/render/themes';

import { groupColor, groupColorName, groupTitle } from './group-names';
import { makeEdition } from './test-utils';

describe('group names follow the colour of the group (bug 27)', () => {
    it('keeps the standard names in the standard colours', () => {
        const edition = makeEdition({ theme: 'classic' });

        for (const group of standardEdition.groups) {
            expect(groupTitle(edition, group.id, 'nl')).toBe(group.name.nl);
            expect(groupTitle(edition, group.id, 'en')).toBe(group.name.en);
        }
    });

    it('calls the brown group purple in Riso, where it is printed purple', () => {
        const edition = makeEdition({ theme: 'riso' });

        expect(groupColor(edition, 'brown')).toBe(
            THEMES.riso.groupColors?.brown,
        );
        expect(groupColorName(edition, 'brown', 'nl')).toEqual({
            name: 'paars',
            before: 'paarse',
        });
        expect(groupTitle(edition, 'brown', 'en')).toBe('Purple');
    });

    it('names the other Riso groups after their own colour', () => {
        const edition = makeEdition({ theme: 'riso' });
        const names = GROUP_IDS.map((id) => groupTitle(edition, id, 'nl'));

        expect(names).toEqual([
            'Paars',
            'Lichtblauw',
            'Roze',
            'Oranje',
            'Rood',
            'Geel',
            'Groen',
            'Donkerblauw',
        ]);
    });

    it('follows a colour the edition chose itself', () => {
        const edition = {
            ...makeEdition({ theme: 'classic' }),
            elements: { 'group.brown': { color: '#808080' } },
        };

        expect(groupColorName(edition, 'brown', 'nl').before).toBe('grijze');
    });
});
