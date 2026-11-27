import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BankCard, Ruler, Scissors } from './table-tools';

describe('the tools on the table', () => {
    it('draws scissors, a ruler and a bank card at the size asked for', () => {
        const width = (node: HTMLElement) =>
            node.querySelector('svg')?.getAttribute('width');

        expect(width(render(<Scissors size={50} />).container)).toBe('50');
        expect(render(<Ruler width={300} />).container.innerHTML).not.toBe(
            render(<Ruler width={160} />).container.innerHTML,
        );
        expect(
            render(<BankCard className="b" />).container.querySelector('.b'),
        ).not.toBeNull();
    });
});
