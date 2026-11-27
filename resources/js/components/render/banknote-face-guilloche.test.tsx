import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
    NOTE_LAYOUT,
    NoteGuilloche,
    noteHatches,
} from './banknote-face-guilloche';

const guilloche = (density: 'full' | 'light') =>
    render(
        <NoteGuilloche
            paper="#F3F0A8"
            patternInk="#112233"
            density={density}
            riso={false}
            full={false}
            clipId="clip-a"
        />,
    ).container;

describe('the guilloche of a theme note', () => {
    it('has two value boxes and two icon boxes inside the field', () => {
        expect(NOTE_LAYOUT.valueBoxes).toHaveLength(2);
        expect(NOTE_LAYOUT.iconBoxes).toHaveLength(2);
        expect(NOTE_LAYOUT.field).toEqual({
            x: 4.6,
            y: 4.6,
            w: 120.8,
            h: 50.8,
        });
    });

    it('draws rings, rosettes and a band at full density, clipped to the field', () => {
        const container = guilloche('full');

        expect(container.querySelector('#clip-a')).not.toBeNull();
        expect(
            container
                .querySelector('[data-pattern="rings"]')
                ?.getAttribute('clip-path'),
        ).toBe('url(#clip-a)');
        expect(
            container.querySelector('[data-pattern="rosette"]'),
        ).not.toBeNull();
        expect(container.querySelector('[data-pattern="band"]')).not.toBeNull();
    });

    it('draws only the rings at light density', () => {
        const container = guilloche('light');

        expect(
            container.querySelector('[data-pattern="rings"]'),
        ).not.toBeNull();
        expect(container.querySelector('[data-pattern="rosette"]')).toBeNull();
        expect(container.querySelector('[data-pattern="band"]')).toBeNull();
    });

    it('hatches the corners closer at full density', () => {
        expect(noteHatches('full')).toMatch(/^M/);
        expect(noteHatches('full').length).toBeGreaterThan(
            noteHatches('light').length,
        );
    });
});
