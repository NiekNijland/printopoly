import { render } from '@testing-library/react';

import { Cartouche, Hatch, VintageRules } from './board-look-vintage';

describe('the Vintage pieces of the board', () => {
    it('draws a double rule, with a diamond in each corner when asked', () => {
        const plain = render(<VintageRules w={30} h={50} color="#123" />);
        const ornate = render(
            <VintageRules w={30} h={50} color="#123" ornaments />,
        );

        expect(plain.container.querySelectorAll('rect')).toHaveLength(2);
        expect(plain.container.querySelectorAll('path')).toHaveLength(0);
        expect(ornate.container.querySelectorAll('path')).toHaveLength(4);
    });

    it('hatches a box with diagonal lines and cuts the corners of a cartouche', () => {
        const hatch = render(
            <Hatch x={0} y={0} w={4} h={2} color="#123" spacing={1} />,
        ).container.querySelector('[data-slot="hatch"] path');
        const cartouche = render(
            <Cartouche x={0} y={0} w={20} h={6} color="#123" fill="#fff" />,
        ).container.querySelectorAll('[data-slot="cartouche"] path');

        expect(hatch?.getAttribute('d')?.match(/M/g)).toHaveLength(6);
        expect(cartouche).toHaveLength(2);
    });
});
