import { copyName } from './copy-name';

describe('copyName', () => {
    it('adds the word for a copy in the language of the edition', () => {
        expect(copyName('Club', 'nl', ['Club'])).toBe('Club (kopie)');
        expect(copyName('Club', 'en', ['Club'])).toBe('Club (copy)');
    });

    it('counts copies instead of stacking them, and skips names that exist', () => {
        expect(
            copyName('Basis (kopie)', 'nl', ['Basis', 'Basis (kopie)']),
        ).toBe('Basis (kopie 2)');
        expect(
            copyName('Basis (kopie 2)', 'nl', [
                'Basis',
                'Basis (kopie)',
                ' Basis (kopie 2) ',
            ]),
        ).toBe('Basis (kopie 3)');
        expect(copyName('Club (copy 4)', 'nl', [])).toBe('Club (kopie)');
    });

    it('keeps a name that is only the suffix', () => {
        expect(copyName('(kopie)', 'nl', [])).toBe('(kopie) (kopie)');
    });
});
