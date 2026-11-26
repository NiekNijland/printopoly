import { parseKey } from '@/lib/render/edition-keys';
import type { PhotoStyle } from '@/lib/render/edition-types';
import { BLEED } from '@/lib/render/print-composition';

/**
 * How far past the trim edge a photo has to reach (B124). A framed photo stays inside its frame, so it has
 * no bleed. A full photo runs on into the bleed of the element as it prints: 3 mm on cards, deeds and the
 * lid, 2.5 mm on a home-print space sticker, and none on money and pawns (they have their own frame).
 */
export function photoBleed(key: string, style: PhotoStyle | undefined): number {
    // A card back photo covers the whole card, so it always runs into the bleed (B56, B130).
    if (parseKey(key)?.kind === 'cardBack') {
        return BLEED;
    }

    if (style !== 'full') {
        return 0;
    }

    switch (parseKey(key)?.kind) {
        case 'deed':
        case 'card':
        case 'boxLid':
            return BLEED;
        case 'space':
            return BLEED - 0.5;
        default:
            return 0;
    }
}
