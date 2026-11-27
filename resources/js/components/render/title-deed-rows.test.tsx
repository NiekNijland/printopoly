import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { THEMES } from '@/lib/render/themes';

import { Row, rowLook } from './title-deed-rows';

describe('the rows of a title deed', () => {
    it('sets the label left and the amount right, in tabular figures', () => {
        const { container } = render(
            <Row label="Huur" value="€ 6" height={5} font={3} />,
        );
        const spans = container.querySelectorAll('[data-row] span');

        expect([...spans].map((span) => span.textContent)).toEqual([
            'Huur',
            '€ 6',
        ]);
    });

    it('has no look of its own in the theme look, and a leader in Vintage', () => {
        const theme = THEMES.classic;
        const vintage = rowLook('vintage', 0, '#C8321F', true, theme);

        expect(rowLook(undefined, 0, '#C8321F', true, theme)).toBeUndefined();
        expect(vintage?.leader).not.toBeNull();

        const { container } = render(
            <Row label="Huur" value="€ 6" height={5} font={3} look={vintage} />,
        );

        expect(container.querySelectorAll('[data-row] span')).toHaveLength(3);
    });
});
