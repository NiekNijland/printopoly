import { catalogPath, loadCatalog } from '@/lib/i18n';

import en from '../../../lang/en.json';
import nl from '../../../lang/nl.json';

describe('i18n', () => {
    it('keys the catalogue the way the provider expects', () => {
        expect(catalogPath('nl')).toBe('/lang/nl.json');
    });

    it('loads only the requested language', async () => {
        const files = await loadCatalog('en');

        expect(Object.keys(files)).toEqual(['/lang/en.json']);
        expect(files['/lang/en.json']?.['nav.my_editions']).toBe('My editions');
    });

    it('fails loudly for a language that does not exist', async () => {
        await expect(loadCatalog('de')).rejects.toThrow(
            'Translation catalogue not found: /lang/de.json',
        );
    });

    it('has every key in both languages', () => {
        expect(Object.keys(en).sort()).toEqual(Object.keys(nl).sort());
    });
});
