import { resolveEdition } from '@/lib/render/edition-resolve';

import { sampleEdition } from './sample-edition';

describe('sampleEdition', () => {
    it('writes every amount on its cards in the currency of the edition (bug 38)', () => {
        for (const locale of ['nl', 'en'] as const) {
            const resolved = resolveEdition(sampleEdition(locale));
            const symbol = resolved.currency.symbol;
            const texts = [
                resolved.decks?.chance[0]?.text ?? '',
                resolved.decks?.chest[0]?.text ?? '',
            ];

            for (const text of texts) {
                expect(text).toContain(symbol);
                expect(text).not.toContain('{currency}');
            }
            const others = ['€', '£', '$', 'M'].filter((s) => s !== symbol);
            for (const other of others) {
                expect(texts.join(' ')).not.toMatch(
                    new RegExp(`\\${other}\\s?\\d`),
                );
            }
        }
    });

    it('starts in pounds in English and in euros in Dutch (B154)', () => {
        expect(sampleEdition('en').currency).toBe('gbp');
        expect(sampleEdition('nl').currency).toBe('eur');
    });
});
