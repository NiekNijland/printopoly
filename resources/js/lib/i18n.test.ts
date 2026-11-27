import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { loadCatalog } from '@/lib/i18n';

import en from '../../../lang/en.json';
import nl from '../../../lang/nl.json';

describe('i18n', () => {
    it('keys the catalogue the way the provider expects', async () => {
        expect(Object.keys(await loadCatalog('nl'))).toEqual(['/lang/nl.json']);
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

    // R5-15: Lukas looked for "test sheet" in the print guide and found "proof sheet"; Emma wondered whether
    // "Tokens" were something else than her pawns.
    it('gives one name to the pawns and to the test sheet, in the site and in the print guide', async () => {
        const content = resolve(__dirname, '../../content/en');
        const files = [
            'printgids.md',
            'faq.md',
            'voorwaarden.md',
            ...(await readdir(resolve(content, 'instructies'))).map(
                (name) => `instructies/${name}`,
            ),
        ];
        const texts = [
            ...Object.values(en),
            ...(await Promise.all(
                files.map((file) => readFile(resolve(content, file), 'utf8')),
            )),
        ];

        expect(texts.filter((text) => /\btokens?\b/i.test(text))).toEqual([]);
        expect(texts.filter((text) => /proof sheet/i.test(text))).toEqual([]);
        expect(en['editor.messages_title']).toBe(en['print.review.title']);
    });
});
