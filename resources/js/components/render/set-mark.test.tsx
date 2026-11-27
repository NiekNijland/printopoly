import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { THEMES } from '@/lib/render/themes';

import { SetMark } from './set-mark';

describe('SetMark', () => {
    it('stamps SET and the number of the set, centred on its point', () => {
        const { container } = render(
            <SetMark number={2} theme={THEMES.classic} cx={31.5} cy={4} />,
        );
        const mark = container.querySelector<HTMLElement>('[data-set-mark]');

        expect(mark?.dataset.setMark).toBe('2');
        expect(mark).toHaveTextContent('SET2');
        expect(screen.getByText('SET')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(mark?.style.left).toBe('31.5mm');
        expect(mark?.style.top).toBe('4mm');
        expect(mark?.style.transform).toBe('translate(-50%, -50%)');
    });

    it('takes the paper and ink of the theme', () => {
        const { container } = render(
            <SetMark number={3} theme={THEMES.riso} cx={0} cy={0} />,
        );
        const mark = container.querySelector<HTMLElement>('[data-set-mark]');
        const badge = screen.getByText('3');

        expect(mark?.style.background).toBe('#FFFDF7');
        expect(mark?.style.color).toBe('#1B1F24');
        expect(badge.style.background).toBe('#1B1F24');
        expect(badge.style.color).toBe('#FFFDF7');
    });
});
