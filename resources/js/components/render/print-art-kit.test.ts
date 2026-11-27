import { spaceKey } from '@/lib/render/edition-keys';
import { resolveEdition } from '@/lib/render/edition-resolve';
import { allPartsOn } from '@/lib/render/print-edition';
import { BLEED } from '@/lib/render/print-page-frame';
import { sampleEdition } from '@/lib/render/sample-edition';

import {
    STICKER_BLEED,
    centreName,
    common,
    deckIconOf,
    deckOf,
    printSources,
    type ArtKit,
} from './print-art-kit';
import type { ArtContext } from './print-item-art';

const edition = allPartsOn(sampleEdition('nl'));
const ctx: ArtContext = {
    edition,
    resolved: resolveEdition(edition),
    set: 'home',
};
const kit: ArtKit = {
    ctx,
    photo: (key) => ({ src: `photo:${key}` }),
    icon: (key) =>
        key === spaceKey(2) ? { preset: 'lucide:coins' } : undefined,
    layers: () => [],
};

describe('the art kit of the print', () => {
    it('keeps a home sticker half a millimetre inside its bleed', () => {
        expect(STICKER_BLEED).toBe(BLEED - 0.5);
    });

    it('gives the renderers the theme, language and bleed of the edition', () => {
        expect(common(ctx, 3)).toMatchObject({
            theme: ctx.resolved.theme,
            locale: ctx.resolved.language,
            bleedMm: 3,
        });
    });

    it('reads the deck of a card key', () => {
        expect(deckOf('card.chance.01')).toBe('chance');
        expect(deckOf('card.chest.03')).toBe('chest');
        expect(deckOf('card.other.01')).toBeNull();
    });

    it('names the centre after the board centre, else the edition', () => {
        expect(centreName(ctx)).toBe(
            ctx.resolved.boardCenter.name ?? ctx.resolved.name,
        );
    });

    it('takes the icon of the first deck space that has one', () => {
        expect(deckIconOf(kit, 'chest')).toEqual({ preset: 'lucide:coins' });
        expect(deckIconOf(kit, 'chance')).toBeUndefined();
    });

    it('hands the board the photos, icons and layers of the kit', () => {
        const sources = printSources(kit);

        expect(sources.photo(spaceKey(1), undefined)).toEqual({
            src: `photo:${spaceKey(1)}`,
        });
        expect(sources.icon(spaceKey(2), undefined)).toEqual({
            preset: 'lucide:coins',
        });
        expect(sources.layers(spaceKey(1), [])).toEqual([]);
    });
});
