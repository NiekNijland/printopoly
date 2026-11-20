import { composePages, type PrintEdition } from './composition';
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

    it('names the denominations on a sheet of banknotes', () => {
        const pages = composePages('money', 'home', edition);

        expect(pageLabel(pages[0]!, 'nl', 'eur')).toBe('Speelgeld: € 1');
        expect(pageLabel(pages[0]!, 'en', 'play')).toMatch(/^Play money: /);
    });

    it('uses the label of the plan for other sheets', () => {
        const pages = composePages('cards', 'home', edition);

        expect(pageLabel(pages[0]!, 'nl', 'eur')).toBe('Kaarten 1 t/m 4');
    });
});
