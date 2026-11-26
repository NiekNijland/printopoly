import { applyChanges } from '@/lib/render/edition-changes';
import { changeOf, makeEdition } from '@/testing/edition-test-utils';

import { summarizeEdition } from './edition-summary';

describe('summarizeEdition', () => {
    it('says what Mijn edities shows of a fresh edition', () => {
        const edition = makeEdition({ id: 'e1', name: 'Club' });

        expect(summarizeEdition(edition)).toEqual({
            id: 'e1',
            name: 'Club',
            language: edition.language,
            theme: edition.theme,
            revision: edition.revision,
            updatedAt: edition.updatedAt,
            createdAt: edition.createdAt,
            customizedSpaces: 0,
            customizedElements: 0,
            customizedPercent: 0,
        });
    });

    it('counts the changed spaces and elements, never 0 % with a change made', () => {
        const fresh = makeEdition();
        const edition = applyChanges(fresh, [
            changeOf(fresh, 'space.01', { name: 'A' }),
            changeOf(fresh, 'card.chance.01', { text: 'x' }),
        ]);

        const summary = summarizeEdition(edition);

        expect(summary).toMatchObject({
            customizedSpaces: 1,
            customizedElements: 2,
        });
        expect(summary.customizedPercent).toBeGreaterThanOrEqual(1);
        expect(summary.customizedPercent).toBeLessThan(100);
    });
});
