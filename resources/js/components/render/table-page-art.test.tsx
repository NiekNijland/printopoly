import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';

import {
    PageArt,
    SectionArt,
    type PageArtName,
    type SectionArtName,
} from './table-page-art';

beforeEach(() => {
    setPage(fakePage());
    vi.stubGlobal(
        'ResizeObserver',
        class {
            observe = vi.fn<(target: Element) => void>();

            disconnect = vi.fn<() => void>();
        },
    );
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);

    return () => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    };
});

const items = (container: HTMLElement) =>
    container.querySelectorAll('[data-settle]');

const stage = (container: HTMLElement) =>
    container.querySelector<HTMLElement>('[aria-hidden="true"]');

describe('PageArt', () => {
    it.each<[PageArtName, number]>([
        ['printgids', 5],
        ['faq', 4],
        ['privacy', 3],
        ['terms', 3],
        ['edition', 4],
        ['contact', 3],
    ])('lays the things of %s on a stage of 400 by 250', (name, count) => {
        const { container } = render(<PageArt name={name} />);

        expect(items(container)).toHaveLength(count);
        expect(stage(container)).toHaveStyle({
            maxWidth: '400px',
            height: '250px',
        });
    });

    it('draws a question mark on the questions page and an envelope on the contact page', () => {
        expect(
            render(<PageArt name="faq" />).getByText('?'),
        ).toBeInTheDocument();
        expect(
            render(<PageArt name="contact" />).container.querySelector(
                'svg[viewBox="0 0 200 130"]',
            ),
        ).not.toBeNull();
    });
});

describe('SectionArt', () => {
    it.each<[SectionArtName, number]>([
        ['proof', 3],
        ['board', 2],
        ['cards', 1],
        ['money', 3],
        ['pawns', 3],
        ['lid', 1],
        ['share', 1],
        ['trouble', 3],
    ])('lays the things of %s on a stage of 360 by 170', (name, count) => {
        const { container } = render(<SectionArt name={name} />);

        expect(items(container)).toHaveLength(count);
        expect(stage(container)).toHaveStyle({
            maxWidth: '360px',
            height: '170px',
        });
    });

    it('draws the box lid of the sample edition in the language of the page', () => {
        setPage(fakePage({ locale: 'en' }));
        const { container } = render(<SectionArt name="lid" />);
        const lid = container.querySelector<HTMLElement>(
            '[data-element="box-lid"]',
        );

        expect(lid?.dataset.theme).toBeTruthy();
        expect(container.textContent).toContain('A game for 2 to 8 players');
    });

    it('marks the trouble section with an exclamation mark', () => {
        expect(
            render(<SectionArt name="trouble" />).getByText('!'),
        ).toBeInTheDocument();
    });
});
