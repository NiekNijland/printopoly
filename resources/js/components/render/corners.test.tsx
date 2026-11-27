import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { THEME_IDS } from '@/lib/render/edition-types';
import { spaceAt } from '@/lib/render/standard-edition';

import { Board } from './board';
import { BoardSpace } from './board-space';

const base = { theme: 'classic', locale: 'nl' } as const;

const slotText = (container: HTMLElement, slot: string) =>
    container.querySelector(`[data-slot="${slot}"]`)?.textContent ?? null;

describe('corners (Niek, feedback 22 nov)', () => {
    it('turns each corner with its place on the board, as the spaces next to it', () => {
        const { container } = render(<Board {...base} editionName="Test" />);
        const turn = (position: number) =>
            container.querySelector<HTMLElement>(
                `[data-position="${position}"]`,
            )?.style.transform;

        expect(turn(0)).toBe('rotate(0deg)');
        expect(turn(10)).toBe('rotate(90deg)');
        expect(turn(20)).toBe('rotate(180deg)');
        expect(turn(30)).toBe('rotate(270deg)');
        // The first space after a corner turns the same way.
        expect(turn(11)).toBe(turn(10));
        expect(turn(21)).toBe(turn(20));
        expect(turn(31)).toBe(turn(30));
    });

    it('sets the content of every corner on the diagonal', () => {
        for (const position of [0, 20, 30]) {
            const { container } = render(
                <BoardSpace {...base} space={spaceAt(position)} />,
            );

            expect(
                container.querySelector(
                    '[data-turned="-45"] [data-slot="name"]',
                ),
            ).not.toBeNull();
        }
    });

    it('puts the place of the jail on the cell, the label above it and the visiting words along the edges', () => {
        const { container } = render(
            <BoardSpace
                {...base}
                space={spaceAt(10)}
                name="Politiebureau Raalte (op bezoek)"
            />,
        );

        expect(slotText(container, 'name')).toBe('Politiebureau Raalte');
        expect(slotText(container, 'in-jail')).toBe('In de cel');
        expect(slotText(container, 'visiting')).toBe('Op');
        expect(slotText(container, 'visiting-2')).toBe('bezoek');
        expect(container.querySelector('[data-slot="cell"]')).not.toBeNull();
        expect(container.querySelector('[data-slot="bars"]')).not.toBeNull();
        // The second leg turns to run up the outer edge.
        expect(
            container.querySelector(
                '[data-turned="-90"] [data-slot="visiting-2"]',
            ),
        ).not.toBeNull();
    });

    it('does not repeat the jail word when the label already says it', () => {
        const { container } = render(
            <BoardSpace {...base} locale="en" space={spaceAt(10)} />,
        );

        expect(slotText(container, 'in-jail')).toBe('In jail');
        expect(container.querySelector('[data-slot="name"]')).toBeNull();
        expect(slotText(container, 'visiting')).toBe('Just');
        expect(slotText(container, 'visiting-2')).toBe('visiting');
    });

    it('prints the standard visiting words when the jail name has no brackets', () => {
        const { container } = render(
            <BoardSpace {...base} space={spaceAt(10)} name="De bajes" />,
        );

        expect(slotText(container, 'name')).toBe('De bajes');
        expect(slotText(container, 'visiting')).toBe('Op');
        expect(slotText(container, 'visiting-2')).toBe('bezoek');
    });

    it('draws a police cap on Go to Jail and a car on Free Parking, with the name around it', () => {
        const goTo = render(<BoardSpace {...base} space={spaceAt(30)} />);
        const parking = render(<BoardSpace {...base} space={spaceAt(20)} />);

        expect(
            goTo.container.querySelector('[data-slot="cap"]'),
        ).not.toBeNull();
        expect(slotText(goTo.container, 'name')).toBe('Ga naar de');
        expect(slotText(goTo.container, 'name-2')).toBe('gevangenis');
        expect(
            parking.container.querySelector('[data-slot="car"]'),
        ).not.toBeNull();
        expect(slotText(parking.container, 'name')).toBe('Vrij');
        expect(slotText(parking.container, 'name-2')).toBe('parkeren');
    });

    it('lets a chosen icon or a photo take the place of the drawing', () => {
        const icon = render(
            <BoardSpace
                {...base}
                space={spaceAt(30)}
                icon={{ preset: 'siren' }}
            />,
        );
        const photo = render(
            <BoardSpace
                {...base}
                space={spaceAt(20)}
                photo={{ src: 'a.jpg' }}
            />,
        );

        expect(icon.container.querySelector('[data-slot="cap"]')).toBeNull();
        expect(
            icon.container.querySelector('[data-icon="siren"]'),
        ).not.toBeNull();
        expect(photo.container.querySelector('[data-slot="car"]')).toBeNull();
        expect(photo.container.querySelector('[data-photo]')).not.toBeNull();
    });

    it('draws the long Start arrow along the outer edge in the second colour of the theme', () => {
        const { container } = render(
            <BoardSpace {...base} theme="gala" space={spaceAt(0)} />,
        );
        const arrow = container.querySelector('[data-slot="start-arrow"] path');

        expect(arrow?.getAttribute('fill')).toBe('#9C5B67');
    });

    it('draws all four corners in every theme', () => {
        for (const theme of THEME_IDS) {
            for (const position of [0, 10, 20, 30]) {
                const { container } = render(
                    <BoardSpace
                        {...base}
                        theme={theme}
                        space={spaceAt(position)}
                    />,
                );

                expect(
                    within(container).getAllByText(/\S/).length,
                ).toBeGreaterThan(0);
            }
        }
    });
});

describe('side spaces', () => {
    it('sets the town inside the colour band, in spaced capitals', () => {
        const { container } = render(
            <BoardSpace {...base} space={spaceAt(1)} town="Beukerstraat" />,
        );
        const town = container.querySelector<HTMLElement>(
            '[data-slot="town"] > div',
        );
        const band = container.querySelector<HTMLElement>(
            '[data-slot="color-bar"]',
        );

        expect(town?.textContent).toBe('Beukerstraat');
        expect(town?.style.textTransform).toBe('uppercase');
        expect(town?.style.letterSpacing).toBe('0.12em');
        expect(
            parseFloat(
                container.querySelector<HTMLElement>('[data-slot="town"]')
                    ?.style.top ?? 'NaN',
            ),
        ).toBeLessThan(parseFloat(band?.style.height ?? '0'));
    });

    it('writes names in capitals, except in Strak', () => {
        const classic = render(<BoardSpace {...base} space={spaceAt(1)} />);
        const strak = render(
            <BoardSpace {...base} theme="strak" space={spaceAt(1)} />,
        );
        const transform = (container: HTMLElement) =>
            container.querySelector<HTMLElement>('[data-slot="name"] > div')
                ?.style.textTransform;

        expect(transform(classic.container)).toBe('uppercase');
        expect(transform(strak.container)).not.toBe('uppercase');
    });

    it('puts the tax amount in an engraved oval', () => {
        const { container } = render(
            <BoardSpace {...base} space={spaceAt(4)} />,
        );

        expect(
            container.querySelectorAll('[data-slot="oval"] ellipse'),
        ).toHaveLength(2);
        expect(slotText(container, 'amount')).toMatch(/^Betaal\s€\s200$/);
    });
});
