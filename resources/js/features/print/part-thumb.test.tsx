import { render } from '@testing-library/react';

import { makeEdition } from '@/testing/edition-test-utils';
import type { PrintPart } from '@/types/generated';

import { PartThumb } from './part-thumb';

const edition = (() => {
    const own = makeEdition({ name: 'Buurtfeest' });
    own.elements['space.01'] = { name: 'Beukenlaan' };
    own.elements['pawn.01'] = { name: 'Fiets' };
    own.elements.box_lid = { name: 'Doos van de buurt' };

    return own;
})();

const thumb = (part: PrintPart, size?: number) => {
    const { container } = render(
        <PartThumb part={part} edition={edition} size={size} />,
    );
    const box = container.querySelector(`[data-thumb="${part}"]`);
    if (!(box instanceof HTMLElement)) {
        throw new Error('no thumbnail');
    }

    return box;
};

describe('PartThumb', () => {
    it('sits in a square of the given size, as decoration', () => {
        const box = thumb('board', 80);

        expect(box).toHaveStyle({ width: '80px', height: '80px' });
        expect(box).toHaveAttribute('aria-hidden', 'true');
    });

    it('draws the board of the edition with its own names', () => {
        const box = thumb('board');

        expect(box.children).toHaveLength(1);
        expect(box).toHaveTextContent('Beukenlaan');
        expect(box).toHaveTextContent('Buurtfeest');
        expect(box.firstElementChild).toHaveStyle({ left: '2px', top: '2px' });
    });

    it.each([
        ['cards', 2],
        ['money', 2],
        ['tokens', 2],
        ['rules_booklet', 2],
        ['invitation', 1],
        ['box_lid', 1],
    ] as const)('lays %s on the table as %i pieces', (part, pieces) => {
        const box = thumb(part);

        expect(box.children).toHaveLength(pieces);
        expect(box.querySelector('svg, img, div')).not.toBeNull();
    });

    it('names the pawns of the edition', () => {
        expect(thumb('tokens')).toHaveTextContent('Fiets');
    });

    it('puts the own title on the box lid', () => {
        expect(thumb('box_lid')).toHaveTextContent('Doos van de buurt');
    });

    it('shows banknotes of 5 and 100', () => {
        const box = thumb('money');

        expect(box).toHaveTextContent('5');
        expect(box).toHaveTextContent('100');
    });

    it('turns the pieces a little', () => {
        const box = thumb('cards');

        expect(
            [...box.children].map((child) =>
                child instanceof HTMLElement ? child.style.transform : '',
            ),
        ).toEqual([
            expect.stringMatching(/rotate\(7deg\)$/),
            expect.stringMatching(/rotate\(-5deg\)$/),
        ]);
    });

    it('draws a ruler and a bank card for the test sheet', () => {
        const box = thumb('calibration', 100);

        expect(box.children).toHaveLength(2);
        expect(box.children[1]).toHaveStyle({ top: '32px', height: '42px' });
    });
});
