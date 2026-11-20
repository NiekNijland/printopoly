import { describe, expect, it } from 'vitest';
import { standardEdition } from '@/lib/game/standard-edition';
import { updateElement } from './changes';
import { resolveEdition } from './resolve';
import { makeEdition } from './test-utils';

describe('card texts that name a space', () => {
    it('use the renamed name of the space', () => {
        const space = standardEdition.spaces.find(
            (candidate) =>
                candidate.name.nl !== 'Start' &&
                standardEdition.decks.chance.some((card) =>
                    card.text.nl.includes(candidate.name.nl),
                ),
        );
        const index = standardEdition.decks.chance.findIndex(
            (card) =>
                space !== undefined && card.text.nl.includes(space.name.nl),
        );

        expect(space).toBeDefined();

        const { edition } = updateElement(
            makeEdition({ language: 'nl' }),
            `space.${String(space?.position).padStart(2, '0')}`,
            { name: 'Raalterwetering' },
        );
        const text = resolveEdition(edition).decks?.chance[index]?.text;

        expect(text).toContain('Raalterwetering');
        expect(text).not.toContain(space?.name.nl);
    });
});
