import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { THEMES } from '@/lib/render/themes';

import {
    FRAME_INSET,
    FullPhoto,
    NOTE_H,
    NOTE_W,
    inkOf,
} from './banknote-styles-shared';

describe('what the money styles share', () => {
    it('frames every style 4.6 mm inside a note of 130 by 60 mm', () => {
        expect([NOTE_W, NOTE_H, FRAME_INSET]).toEqual([130, 60, 4.6]);
    });

    it('prints black in Strak and a deep shade of the paper elsewhere', () => {
        expect(inkOf(THEMES.strak, '#F3F0A8')).toBe(THEMES.strak.ink);
        expect(inkOf(THEMES.classic, '#F3F0A8')).not.toBe('#F3F0A8');
    });

    it('lays a light wash over a full photo', () => {
        const { container } = render(
            <FullPhoto
                field={{ x: 1, y: 2, w: 30, h: 20 }}
                photo={{ src: 'a.jpg', style: 'full' }}
                light="#FFFFFF"
                radius={4}
            />,
        );

        expect(
            container.querySelector('[data-slot="photo-wash"]'),
        ).not.toBeNull();
        expect(container.querySelector('img')).not.toBeNull();
    });
});
