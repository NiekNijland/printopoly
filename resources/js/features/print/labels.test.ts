import {
    composePages,
    type PrintEdition,
} from '../../lib/render/print-composition';
import { localizeLabel, pageLabel } from './labels';

const edition: PrintEdition = { elements: {} };

describe('sheet labels', () => {
    it('stays Dutch for a Dutch edition and turns English for an English one', () => {
        expect(localizeLabel('Kaarten 1 t/m 4', 'nl')).toBe('Kaarten 1 t/m 4');
        expect(localizeLabel('Kaarten 1 t/m 4', 'en')).toBe('Cards 1 to 4');
        expect(localizeLabel('Hoekvak 70 × 70 mm', 'en')).toBe(
            'Corner space 70 × 70 mm',
        );
    });

    it('writes a decimal point on an English sheet (Lukas, R5-19)', () => {
        expect(localizeLabel('Gewoon vak 38,22 × 64 mm', 'en')).toBe(
            'Regular space 38.22 × 64 mm',
        );
        expect(localizeLabel('Gewoon vak 38,22 × 64 mm', 'nl')).toBe(
            'Gewoon vak 38,22 × 64 mm',
        );
    });

    it('names the denominations on a sheet of banknotes', () => {
        const pages = composePages('money', 'home', edition);

        // The notes are dealt out by value, so the first sheet has six values (R5-29).
        expect(pageLabel(pages[0]!, 'nl', 'eur')).toBe(
            'Speelgeld: €\u00A01, €\u00A05, €\u00A010, €\u00A020, €\u00A050, €\u00A0100',
        );
        expect(pageLabel(pages[0]!, 'en', 'play')).toMatch(/^Play money: /);
    });

    it('uses the label of the plan for other sheets', () => {
        const pages = composePages('cards', 'home', edition);

        expect(pageLabel(pages[2]!, 'nl', 'eur')).toBe(
            'Kaarten 1 t/m 9, voorkant',
        );
        expect(pageLabel(pages[3]!, 'en', 'eur')).toBe('Cards 1 to 9, backs');
    });
});
