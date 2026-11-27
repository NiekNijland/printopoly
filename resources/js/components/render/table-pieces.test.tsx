import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { defined } from '@/testing/defined';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { root } from '@/testing/render-dom';

import {
    BoardPiece,
    CardFan,
    CardPiece,
    Die,
    INK,
    NotePiece,
    PAPER,
    Pawn,
    SpacePiece,
} from './table-pieces';

beforeEach(() => {
    setPage(fakePage());
});

const elementOf = (container: HTMLElement, name: string) =>
    container.querySelector<HTMLElement>(`[data-element="${name}"]`);

describe('BoardPiece', () => {
    it('draws the sample board at the given width with the edition name', () => {
        const container = render(<BoardPiece width={300} />).container;

        expect(root(container).style.width).toBe('300px');
        expect(elementOf(container, 'board')?.dataset.theme).toBe('classic');
        expect(container.textContent).toContain('Zaterdagclub');
        expect(container.textContent).toContain('Jans Bierkelder');
    });

    it('takes an own name and theme', () => {
        const container = render(
            <BoardPiece width={300} name="Familiedag" theme="riso" />,
        ).container;

        expect(elementOf(container, 'board')?.dataset.theme).toBe('riso');
        expect(container.textContent).toContain('Familiedag');
        expect(container.textContent).not.toContain('Zaterdagclub');
    });

    it('follows the language of the page', () => {
        setPage(fakePage({ locale: 'en' }));

        expect(
            render(<BoardPiece width={300} />).container.textContent,
        ).toContain('Saturday Club');
    });

    it('curls one corner back on a square of the width when peeled', () => {
        const container = render(<BoardPiece width={240} peel />).container;
        const wrapper = root(container);
        const clipped = defined(
            elementOf(container, 'board')?.closest<HTMLElement>(
                '[style*="clip-path"]',
            ),
        );

        expect(wrapper.getAttribute('aria-hidden')).toBe('true');
        expect(wrapper.style.width).toBe('240px');
        expect(wrapper.style.height).toBe('240px');
        expect(clipped.style.clipPath).toBe(
            'polygon(0 0, 80% 0, 100% 20%, 100% 100%, 0 100%)',
        );
        expect(
            wrapper
                .querySelector(':scope > svg > polygon')
                ?.getAttribute('points'),
        ).toBe('80,0 100,20 80,20');
        expect(
            wrapper
                .querySelector(':scope > svg > polygon')
                ?.getAttribute('fill'),
        ).toBe(PAPER);
    });

    it('has no curled corner without peel', () => {
        expect(
            render(<BoardPiece width={240} />).container.querySelector(
                '[style*="clip-path"]',
            ),
        ).toBeNull();
    });
});

describe('CardPiece', () => {
    it('draws the first Chance card with the sample text', () => {
        const container = render(
            <CardPiece kind="chance" width={120} />,
        ).container;

        expect(elementOf(container, 'card-chance-front')).not.toBeNull();
        expect(container.textContent).toContain('Je verliest de pot');
        expect(root(container).style.width).toBe('120px');
    });

    it('draws the first Community Chest card with the sample text', () => {
        const container = render(
            <CardPiece kind="chest" width={120} />,
        ).container;

        expect(elementOf(container, 'card-chest-front')).not.toBeNull();
        expect(container.textContent).toContain('Je wint de pubquiz');
    });

    it('draws the first title deed with its own name', () => {
        const container = render(
            <CardPiece kind="deed" width={120} />,
        ).container;

        expect(elementOf(container, 'deed-street-front')).not.toBeNull();
        expect(container.querySelector('[data-slot="name"]')?.textContent).toBe(
            'JANS BIERKELDER',
        );
    });
});

describe('NotePiece and SpacePiece', () => {
    it('draws a banknote of the value', () => {
        const container = render(
            <NotePiece value={50} width={200} />,
        ).container;

        expect(elementOf(container, 'banknote')).not.toBeNull();
        expect(
            container.querySelector('[data-slot="value"]')?.textContent,
        ).toContain('50');
    });

    it('draws a renamed street with the sample name, another with its standard name', () => {
        const renamed = render(
            <SpacePiece position={1} width={80} />,
        ).container;
        const standard = render(
            <SpacePiece position={39} width={80} />,
        ).container;

        expect(elementOf(renamed, 'space-street')).not.toBeNull();
        expect(renamed.textContent).toContain('Jans Bierkelder');
        expect(standard.textContent).not.toContain('Jans Bierkelder');
        expect(standard.textContent).toContain('Kroonplein');
    });
});

describe('CardFan', () => {
    it('fans out Chance, a deed and Community Chest, each half the width', () => {
        const container = render(<CardFan width={200} />).container;
        const holders = [...root(container).children].filter(
            (child) => child instanceof HTMLElement,
        );

        expect(holders.map((holder) => holder.style.transform)).toEqual([
            'rotate(-14deg)',
            'rotate(12deg)',
            'rotate(-2deg)',
        ]);
        expect(holders.map((holder) => holder.style.width)).toEqual(
            Array(3).fill('100px'),
        );
        expect(elementOf(container, 'card-chance-front')).not.toBeNull();
        expect(elementOf(container, 'card-chest-front')).not.toBeNull();
        expect(elementOf(container, 'deed-street-front')).not.toBeNull();
    });

    it('is as tall as a card plus room for the turn', () => {
        const container = render(<CardFan width={200} />).container;

        expect(parseFloat(root(container).style.height)).toBeCloseTo(
            (100 * 88) / 63 + 30,
            3,
        );
    });
});

describe('Pawn and Die', () => {
    it('draws a pawn in its colour with an ink outline, at the size and its aspect', () => {
        const svg = defined(
            render(<Pawn color="#E6007E" size={40} />).container.querySelector(
                'svg',
            ),
        );
        const filled = [...svg.querySelectorAll('[stroke]')];

        expect(svg.getAttribute('width')).toBe('40');
        expect(svg.getAttribute('height')).toBe('56');
        expect(filled).toHaveLength(4);
        expect(
            filled.every((part) => part.getAttribute('fill') === '#E6007E'),
        ).toBe(true);
        expect(
            filled.every((part) => part.getAttribute('stroke') === INK),
        ).toBe(true);
    });

    it('draws a die showing five ink pips on paper', () => {
        const svg = defined(
            render(<Die size={30} />).container.querySelector('svg'),
        );
        const pips = [...svg.querySelectorAll('circle')];

        expect(svg.getAttribute('width')).toBe('30');
        expect(svg.querySelector('rect')?.getAttribute('fill')).toBe(PAPER);
        expect(pips).toHaveLength(5);
        expect(pips.every((pip) => pip.getAttribute('fill') === INK)).toBe(
            true,
        );
    });

    it('uses the default sizes', () => {
        expect(
            render(<Pawn color="#000000" />)
                .container.querySelector('svg')
                ?.getAttribute('width'),
        ).toBe('44');
        expect(
            render(<Die />)
                .container.querySelector('svg')
                ?.getAttribute('width'),
        ).toBe('40');
    });
});
