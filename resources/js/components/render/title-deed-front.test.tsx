import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { deedsFor } from '@/lib/render/standard-edition';

import { DeedFront } from './title-deed-front';

const street = deedsFor().find((space) => space.type === 'street');
const utility = deedsFor().find((space) => space.type === 'utility');

describe('DeedFront', () => {
    it('lists the rents, a rule and the building costs of a street', () => {
        if (street === undefined) {
            throw new Error('the standard edition has streets');
        }
        const { container } = render(
            <DeedFront space={street} w={63} h={88} bleed={0} />,
        );

        expect(
            container.querySelectorAll('[data-slot="rent-table"] [data-row]')
                .length,
        ).toBeGreaterThan(3);
        expect(container.querySelector('[data-slot="rule"]')).not.toBeNull();
        expect(container.querySelector('[data-slot="costs"]')).not.toBeNull();
    });

    it('explains a utility in a footer, with its icon', () => {
        if (utility === undefined) {
            throw new Error('the standard edition has utilities');
        }
        const { container } = render(
            <DeedFront space={utility} w={63} h={88} bleed={0} />,
        );

        expect(
            container.querySelector('[data-slot="footer"]')?.textContent,
        ).not.toBe('');
        expect(container.querySelector('[data-slot="costs"]')).toBeNull();
    });
});
