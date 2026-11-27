import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { noteIcons } from '@/lib/render/banknote-pattern';

import {
    PLAYFUL,
    PlayfulArt,
    playfulBadge,
} from './banknote-styles-playful-art';

const art = (full: boolean) =>
    render(
        <PlayfulArt
            value={100}
            paper="#F3F0A8"
            ink="#112233"
            light="#FFFFEE"
            accents={['#FF0000', '#00FF00', '#112233']}
            full={full}
        />,
    ).container;

describe('the drawing of a Speels note', () => {
    it('has two value bubbles and two icon bubbles', () => {
        expect(PLAYFUL.bubbles.map((bubble) => bubble.kind)).toEqual([
            'value',
            'icon',
            'icon',
            'value',
        ]);
    });

    it('draws dots, a frame, confetti, the badge, four bubbles and the icons of the value', () => {
        const container = art(false);

        expect(container.querySelector('[data-slot="dots"]')).not.toBeNull();
        expect(container.querySelector('[data-frame]')).not.toBeNull();
        expect(
            container.querySelectorAll('[data-slot="confetti"] path'),
        ).toHaveLength(14);
        expect(
            container
                .querySelector('[data-slot="badge"] [data-oval]')
                ?.getAttribute('d'),
        ).toBe(playfulBadge());
        expect(container.querySelectorAll('[data-corner]')).toHaveLength(4);
        expect(
            [...container.querySelectorAll('[data-note-icon]')].map((icon) =>
                icon.getAttribute('data-note-icon'),
            ),
        ).toEqual(noteIcons(100));
    });

    it('leaves the dots off under a full photo', () => {
        expect(art(true).querySelector('[data-slot="dots"]')).toBeNull();
    });
});
