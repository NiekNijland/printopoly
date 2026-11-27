import { renderToStaticMarkup } from 'react-dom/server';

import { BoardSpace } from '@/components/render/board-space';
import { GameCard } from '@/components/render/game-card';
import { PATH_NAMES } from '@/components/render/icons';
import { LUCIDE_SPACE_ICONS } from '@/components/render/lucide-space-icons';
import { TitleDeed } from '@/components/render/title-deed';
import { parseOverride } from '@/lib/render/edition-schema';
import { iconTargets, photoTargets } from '@/lib/render/print-photo-targets';
import {
    isOwnable,
    spaceAt,
    standardEdition,
} from '@/lib/render/standard-edition';
import { makeEdition, photo } from '@/testing/edition-test-utils';

import {
    ICON_CATEGORIES,
    ICONS_BY_KIND,
    LUCIDE_BY_KIND,
    LUCIDE_CATALOGUE,
    isSpaceIconPreset,
    spaceIconName,
    SPACE_ICON_NAMES,
    SPACE_ICON_PRESETS,
    defaultSpaceIcon,
    iconKindOf,
} from './space-icons';

const common = { theme: 'classic', locale: 'nl', currency: 'eur' } as const;

describe('space icons (B136)', () => {
    it('offers six to ten drawn icons per kind, the standard one first', () => {
        for (const list of Object.values(ICONS_BY_KIND)) {
            expect(list.length).toBeGreaterThanOrEqual(6);
            expect(list.length).toBeLessThanOrEqual(10);
        }
        const standards = standardEdition.spaces.flatMap((space) => {
            const kind = iconKindOf(space);
            const standard = defaultSpaceIcon(space);

            return kind === null || standard === null
                ? []
                : [ICONS_BY_KIND[kind].includes(standard)];
        });
        expect(standards.length).toBeGreaterThan(0);
        expect(standards.every(Boolean)).toBe(true);
        for (const id of SPACE_ICON_PRESETS) {
            expect(PATH_NAMES).toContain(id);
            expect(SPACE_ICON_NAMES[id].nl).not.toBe('');
        }
    });

    it('accepts an icon or an uploaded image on special spaces only', () => {
        const errors: string[] = [];
        expect(
            parseOverride('space.30', { icon: { preset: 'siren' } }, errors),
        ).toEqual({ icon: { preset: 'siren' } });
        expect(
            parseOverride(
                'space.12',
                { icon: { photo: photo(), aspect: 2 } },
                errors,
            ),
        ).toEqual({ icon: { photo: photo(), aspect: 2 } });
        expect(errors).toEqual([]);

        expect(
            parseOverride('space.01', { icon: { preset: 'train' } }, []),
        ).toBeUndefined();
        expect(
            parseOverride('space.05', { icon: { preset: 'nope' } }, []),
        ).toBeUndefined();
        expect(
            parseOverride('space.05', { icon: { photo: photo() } }, []),
        ).toBeUndefined();
        expect(
            parseOverride('deed.03', { icon: { preset: 'bus' } }, []),
        ).toBeUndefined();
    });

    it('draws the chosen icon on the space, the standard one without a choice', () => {
        const station = spaceAt(5);
        const tax = spaceAt(4);

        expect(
            renderToStaticMarkup(<BoardSpace {...common} space={station} />),
        ).toContain('data-icon="train"');
        expect(
            renderToStaticMarkup(
                <BoardSpace
                    {...common}
                    space={station}
                    icon={{ preset: 'ferry' }}
                />,
            ),
        ).toContain('data-icon="ferry"');
        // Tax has no icon of its own; a chosen one is added.
        expect(
            renderToStaticMarkup(<BoardSpace {...common} space={tax} />),
        ).not.toContain('data-icon=');
        expect(
            renderToStaticMarkup(
                <BoardSpace
                    {...common}
                    space={tax}
                    icon={{ preset: 'piggy-bank' }}
                />,
            ),
        ).toContain('data-icon="piggy-bank"');
        for (const position of [0, 10, 20, 30]) {
            expect(
                renderToStaticMarkup(
                    <BoardSpace
                        {...common}
                        space={spaceAt(position)}
                        icon={{ preset: 'star' }}
                    />,
                ),
            ).toContain('data-icon="star"');
        }
    });

    it('draws a lucide icon (B196) like our own: same box, same line, a 20 x 20 view box', () => {
        const html = renderToStaticMarkup(
            <BoardSpace
                {...common}
                space={spaceAt(5)}
                icon={{ preset: 'lucide:ship' }}
            />,
        );

        expect(html).toContain('data-icon="lucide:ship"');
        expect(html).toContain('viewBox="2 2 20 20"');
        const own = renderToStaticMarkup(
            <BoardSpace {...common} space={spaceAt(5)} />,
        );
        const lucideBox =
            /<svg[^>]*style="([^"]*)"[^>]*data-icon="lucide:ship"/.exec(
                html,
            )?.[1];
        const ownBox = /<svg[^>]*style="([^"]*)"[^>]*data-icon="train"/.exec(
            own,
        )?.[1];
        expect(lucideBox).toBeDefined();
        expect(lucideBox).toBe(ownBox);
    });

    it('keeps the lucide catalogue, the drawings and the suggestions in step (B196)', () => {
        const ids = LUCIDE_CATALOGUE.map((entry) => entry.id);

        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.length).toBeGreaterThan(200);
        expect(Object.keys(LUCIDE_SPACE_ICONS).sort()).toEqual([...ids].sort());
        for (const entry of LUCIDE_CATALOGUE) {
            expect(entry.categories.length).toBeGreaterThan(0);
            for (const category of entry.categories) {
                expect(ICON_CATEGORIES).toContain(category);
            }
            expect(isSpaceIconPreset(entry.id)).toBe(true);
            expect(spaceIconName(entry.id, 'nl')).toBe(entry.nl);
            expect(spaceIconName(entry.id, 'en')).toBe(entry.en);
        }
        for (const list of Object.values(LUCIDE_BY_KIND)) {
            expect(list.length).toBeGreaterThanOrEqual(6);
            expect(list.every((id) => isSpaceIconPreset(id))).toBe(true);
        }
        // The stored ids of our own icons keep working.
        expect(isSpaceIconPreset('ferry')).toBe(true);
        expect(spaceIconName('ferry', 'nl')).toBe('Veerboot');
        expect(isSpaceIconPreset('lucide:not-in-the-set')).toBe(false);
    });

    it('draws an uploaded image whole, in its own shape', () => {
        const html = renderToStaticMarkup(
            <BoardSpace
                {...common}
                space={spaceAt(30)}
                icon={{ photo: { src: 'x.png' }, aspect: 2 }}
            />,
        );

        expect(html).toContain('data-icon-photo="filled"');
        const [, w, h] =
            /data-icon-photo="filled" data-w="([\d.]+)" data-h="([\d.]+)"/.exec(
                html,
            ) ?? [];
        expect(Number(w) / Number(h)).toBeCloseTo(2);
    });

    it('passes the icon to the deed and the standard card back', () => {
        const station = spaceAt(15);
        if (!isOwnable(station)) {
            throw new TypeError('Space 15 is a station');
        }

        for (const side of ['front', 'back'] as const) {
            expect(
                renderToStaticMarkup(
                    <TitleDeed
                        {...common}
                        space={station}
                        side={side}
                        icon={{ preset: 'tram' }}
                    />,
                ),
            ).toContain('data-icon="tram"');
        }
        expect(
            renderToStaticMarkup(
                <GameCard
                    {...common}
                    deck="chance"
                    side="back"
                    icon={{ preset: 'clover' }}
                />,
            ),
        ).toContain('data-icon="clover"');
    });

    it('measures the print frame of an uploaded icon in both sets', () => {
        const edition = {
            ...makeEdition(),
            elements: {
                'space.28': { icon: { photo: photo('icon'), aspect: 0.5 } },
                'space.30': { icon: { preset: 'siren' as const } },
            },
        };
        const targets = photoTargets(edition);

        for (const set of ['printer', 'home'] as const) {
            const target = targets[set]['space.28#icon'];
            expect(target).toBeDefined();
            expect((target?.w ?? 0) / (target?.h ?? 1)).toBeCloseTo(0.5, 1);
        }
        expect(targets.printer['space.30#icon']).toBeUndefined();
        expect(Object.keys(iconTargets(edition))).toEqual(['space.28']);
    });
});
