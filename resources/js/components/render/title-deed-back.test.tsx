import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { deedsFor } from '@/lib/render/standard-edition';

import { DeedBack } from './title-deed-back';

const street = deedsFor().find((space) => space.type === 'street');

describe('DeedBack', () => {
    it('holds the mortgage and its text, and a story when there is one', () => {
        if (street === undefined) {
            throw new Error('the standard edition has streets');
        }
        const draw = (story?: string) =>
            render(
                <DeedBack
                    space={street}
                    w={63}
                    h={88}
                    bleed={0}
                    {...(story === undefined ? {} : { story })}
                />,
            ).container;

        expect(
            draw().querySelector('[data-slot="mortgage"]')?.textContent,
        ).not.toBe('');
        expect(
            draw().querySelector('[data-slot="mortgage-text"]'),
        ).not.toBeNull();
        expect(draw().querySelector('[data-slot="story"]')).toBeNull();
        expect(
            draw('Hier stond de molen.').querySelector('[data-slot="story"]')
                ?.textContent,
        ).toBe('Hier stond de molen.');
    });
});
