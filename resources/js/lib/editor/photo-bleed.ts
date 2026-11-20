import { parseKey } from '@/lib/edition/keys';
import type { PhotoStyle } from '@/lib/edition/types';
import { BLEED } from '@/lib/print/composition';

/**
 * How far past the trim edge a photo has to reach (B124). A framed photo stays inside its frame, so it has
 * no bleed. A full photo runs on into the bleed of the element as it prints: 3 mm on cards, deeds and the
 * lid, 2.5 mm on a home-print space sticker, and none on money and pawns (they have their own frame).
 */
export function photoBleed(key: string, style: PhotoStyle | undefined): number {
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
