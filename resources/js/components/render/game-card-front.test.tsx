import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CardFront } from './game-card-front';

const front = (extra: Partial<Parameters<typeof CardFront>[0]> = {}) =>
    render(
        <CardFront
            deck="chest"
            w={63}
            h={88}
            name="Algemeen Fonds"
            body="Je wint een schoonheidswedstrijd"
            amount={undefined}
            bleed={0}
            {...extra}
        />,
    ).container;

const text = (container: HTMLElement, slot: string) =>
    container.querySelector(`[data-slot="${slot}"]`)?.textContent ?? null;

describe('CardFront', () => {
    it('sets the name and the text, and no amount line without an amount', () => {
        const container = front();

        expect(text(container, 'title')).toBe('Algemeen Fonds');
        expect(text(container, 'text')).toBe(
            'Je wint een schoonheidswedstrijd',
        );
        expect(text(container, 'amount')).toBeNull();
    });

    it('says what the player receives or pays, with its purpose', () => {
        expect(text(front({ amount: 10 }), 'amount')).toContain('10');
        expect(
            text(front({ amount: -50, purpose: 'je taalcursus' }), 'amount'),
        ).toContain('je taalcursus');
    });

    it('frames a photo under the name, or fills the card with a full one', () => {
        const framed = front({ photo: { src: 'a.jpg' } });
        const full = front({ photo: { src: 'a.jpg', style: 'full' } });

        expect(framed.querySelector('[data-slot="art"]')).not.toBeNull();
        expect(full.querySelector('[data-slot="title-band"]')).not.toBeNull();
        expect(full.querySelector('[data-slot="text-panel"]')).not.toBeNull();
    });
});
