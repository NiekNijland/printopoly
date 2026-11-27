import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Abs, BoxSvg, CardFrame, Frame, Sheet, Svg, useRender } from './sheet';

const Probe = () => {
    const { theme, locale, currency, money, words, style } = useRender();

    return (
        <p>
            {[
                theme.id,
                locale,
                currency,
                money(1500),
                words.currencySymbol ?? '-',
                style?.groupColors?.brown ?? '-',
            ].join('|')}
        </p>
    );
};

const sheet = (element: HTMLElement) =>
    element.querySelector<HTMLElement>('[data-element]');

describe('Sheet', () => {
    it('is the trim size plus bleed, with the content on the trim box', () => {
        const { container } = render(
            <Sheet
                element="card"
                theme="riso"
                locale="nl"
                bleedMm={3}
                widthMm={63}
                heightMm={88}
                background="#FFFFFF"
                className="extra"
            >
                <span>inhoud</span>
            </Sheet>,
        );
        const outer = sheet(container);
        const trim = container.querySelector<HTMLElement>('[data-trim]');

        expect(outer?.dataset.element).toBe('card');
        expect(outer?.dataset.theme).toBe('riso');
        expect(outer?.dataset.bleedMm).toBe('3');
        expect(outer).toHaveClass('extra');
        expect(outer?.style.width).toBe('69mm');
        expect(outer?.style.height).toBe('94mm');
        expect(outer?.style.borderRadius).toBe('0mm');
        expect(trim?.style.left).toBe('3mm');
        expect(trim?.style.width).toBe('63mm');
        expect(screen.getByText('inhoud').parentElement).toBe(trim);
    });

    it('rounds the corners only without bleed', () => {
        const { container } = render(
            <Sheet
                element="card"
                theme="classic"
                locale="nl"
                widthMm={63}
                heightMm={88}
                background="#FFFFFF"
                rounded
            />,
        );

        expect(sheet(container)?.style.borderRadius).toBe('3mm');
    });

    it('draws an underlay below the content', () => {
        const { container } = render(
            <Sheet
                element="lid"
                theme="classic"
                locale="nl"
                widthMm={10}
                heightMm={10}
                background="#FFFFFF"
                underlay={<span>onder</span>}
            />,
        );

        expect(sheet(container)?.firstElementChild).toHaveTextContent('onder');
    });

    it('gives the renderers the default currency of the language', () => {
        render(
            <Sheet
                element="x"
                theme="strak"
                locale="en"
                widthMm={10}
                heightMm={10}
                background="#FFFFFF"
            >
                <Probe />
            </Sheet>,
        );

        expect(screen.getByText('strak|en|gbp|£1,500|-|-')).toBeInTheDocument();
    });

    it('gives the renderers the currency, words and style of the edition', () => {
        const { container } = render(
            <Sheet
                element="x"
                theme="gala"
                locale="nl"
                currency="usd"
                words={{ currencySymbol: 'K' }}
                style={{ groupColors: { brown: '#111111' } }}
                widthMm={10}
                heightMm={10}
                background="#FFFFFF"
            >
                <Probe />
            </Sheet>,
        );

        expect(container.querySelector('p')?.textContent).toBe(
            'gala|nl|usd|K\u00A01.500|K|#111111',
        );
    });

    it('falls back to the classic theme in Dutch outside a sheet', () => {
        const { container } = render(<Probe />);

        expect(container.querySelector('p')?.textContent).toBe(
            'classic|nl|eur|€\u00A01.500|-|-',
        );
    });
});

describe('Abs', () => {
    it('places its children in mm with its own style and slot', () => {
        const { container } = render(
            <Abs x={1} y={2} w={3} h={4} slot="box" style={{ color: 'red' }}>
                ja
            </Abs>,
        );
        const element =
            container.querySelector<HTMLElement>('[data-slot="box"]');

        expect(element?.style.left).toBe('1mm');
        expect(element?.style.height).toBe('4mm');
        expect(element?.style.color).toBe('red');
        expect(element).toHaveTextContent('ja');
    });
});

describe('Frame', () => {
    it('keeps the stroke inside the box', () => {
        const { container } = render(
            <Frame
                x={0}
                y={0}
                w={20}
                h={10}
                color="#000000"
                strokeMm={1}
                radiusMm={2}
            />,
        );
        const rect = container.querySelector('rect');

        expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe(
            '0 0 20 10',
        );
        expect(rect?.getAttribute('x')).toBe('0.5');
        expect(rect?.getAttribute('width')).toBe('19');
        expect(rect?.getAttribute('height')).toBe('9');
        expect(rect?.getAttribute('rx')).toBe('2');
        expect(rect?.getAttribute('fill')).toBe('none');
        expect(container.querySelector('[data-ornament]')).toBeNull();
    });

    it('adds the thin second line of an ornate frame in a theme with an ornament', () => {
        const { container } = render(
            <Sheet
                element="x"
                theme="gala"
                locale="nl"
                widthMm={20}
                heightMm={10}
                background="#FFFFFF"
            >
                <Frame
                    x={0}
                    y={0}
                    w={20}
                    h={10}
                    color="#000000"
                    strokeMm={1}
                    ornate
                />
            </Sheet>,
        );
        const ornament = container.querySelector('[data-ornament]');

        expect(ornament?.getAttribute('x')).toBe('2.2');
        expect(ornament?.getAttribute('stroke')).toBe('#B8923F');
        expect(ornament?.getAttribute('width')).toBe('15.6');
    });

    it('has no ornament in a theme without one', () => {
        const { container } = render(
            <Frame
                x={0}
                y={0}
                w={20}
                h={10}
                color="#000000"
                strokeMm={1}
                ornate
            />,
        );

        expect(container.querySelector('[data-ornament]')).toBeNull();
    });
});

describe('Svg', () => {
    it('places a hidden svg in mm with a matching view box and slot', () => {
        const { container } = render(
            <Svg x={1} y={2} w={30} h={40} slot="test-art">
                <rect />
            </Svg>,
        );
        const svg = container.querySelector('svg');

        expect(svg?.getAttribute('viewBox')).toBe('0 0 30 40');
        expect(svg?.getAttribute('data-slot')).toBe('test-art');
        expect(svg?.getAttribute('aria-hidden')).toBe('true');
        expect(svg?.style.left).toBe('1mm');
        expect(svg?.style.top).toBe('2mm');
        expect(svg?.style.width).toBe('30mm');
        expect(svg?.style.overflow).toBe('visible');
        expect(svg?.querySelector('rect')).not.toBeNull();
    });

    it('clips its drawing when asked and takes extra style last', () => {
        const { container } = render(
            <Svg x={0} y={0} w={5} h={5} clip style={{ opacity: 0.5 }}>
                <rect />
            </Svg>,
        );
        const svg = container.querySelector('svg');

        expect(svg?.style.overflow).toBe('hidden');
        expect(svg?.style.opacity).toBe('0.5');
        expect(svg?.hasAttribute('data-slot')).toBe(false);
    });
});

describe('BoxSvg', () => {
    it('fills its box from the corner without a place, an overflow or a slot of its own', () => {
        const { container } = render(
            <BoxSvg w={10} h={5}>
                <rect />
            </BoxSvg>,
        );
        const svg = container.querySelector('svg');

        expect(svg?.getAttribute('style')).toBe(
            'position: absolute; left: 0px; top: 0px; width: 10mm; height: 5mm;',
        );
        expect(svg?.getAttribute('viewBox')).toBe('0 0 10 5');
    });

    it('takes its own view box and data attributes', () => {
        const { container } = render(
            <BoxSvg
                x={1}
                w={10}
                h={10}
                overflow="visible"
                viewBox="0 0 2 2"
                data-frame=""
                data-slot="disc"
            >
                <rect />
            </BoxSvg>,
        );
        const svg = container.querySelector('svg');

        expect(svg?.style.left).toBe('1mm');
        expect(svg?.style.top).toBe('0px');
        expect(svg?.style.overflow).toBe('visible');
        expect(svg?.getAttribute('viewBox')).toBe('0 0 2 2');
        expect(svg?.getAttribute('data-frame')).toBe('');
        expect(svg?.getAttribute('data-slot')).toBe('disc');
    });
});

describe('Abs with data attributes', () => {
    it('places its box in mm with extra style and data attributes after its slot', () => {
        const { container } = render(
            <Abs
                x={1}
                y={2}
                w={30}
                h={10}
                style={{ transform: 'rotate(-2deg)' }}
                slot="edition-plate"
                data-title-style="stamp"
            />,
        );
        const box = container.querySelector<HTMLElement>(
            '[data-slot="edition-plate"]',
        );

        expect(box?.getAttribute('data-title-style')).toBe('stamp');
        expect(box?.style.transform).toBe('rotate(-2deg)');
        expect(box?.style.left).toBe('1mm');
    });
});

describe('CardFrame', () => {
    it('draws the ornate frame of a card 3 mm inside its edge', () => {
        const { container } = render(<CardFrame w={60} h={90} />);
        const svg = container.querySelector<SVGElement>('svg[data-frame]');

        expect(svg?.style.left).toBe('3mm');
        expect(svg?.style.width).toBe('54mm');
        expect(svg?.style.height).toBe('84mm');
    });
});
