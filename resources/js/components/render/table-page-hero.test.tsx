import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';

import { PageHero, TONE_CLASS } from './table-page-hero';

beforeEach(() => {
    setPage(fakePage());
    vi.stubGlobal(
        'ResizeObserver',
        class {
            observe = vi.fn<(target: Element) => void>();

            disconnect = vi.fn<() => void>();
        },
    );

    return () => {
        vi.unstubAllGlobals();
    };
});

describe('PageHero', () => {
    it('shows the title and its children on the band of its tone, with the drawing beside them', () => {
        const { container } = render(
            <PageHero tone="chance" art="faq" title="Vragen">
                <p>Alles over printen</p>
            </PageHero>,
        );
        const band = container.querySelector('section');
        const inner = band?.firstElementChild;
        const artColumn = inner?.lastElementChild;

        expect(
            screen.getByRole('heading', { level: 1, name: 'Vragen' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Alles over printen')).toBeInTheDocument();
        expect(band).toHaveClass('bg-print-chance');
        expect(inner).toHaveClass('md:py-16', 'py-8');
        expect(artColumn).not.toHaveClass('max-md:hidden');
        expect(artColumn).not.toHaveClass('md:max-w-[280px]');
        expect(artColumn?.querySelectorAll('[data-settle]')).toHaveLength(4);
    });

    it('is lower with a smaller drawing when compact, and hides the drawing on a phone when asked', () => {
        const { container } = render(
            <PageHero
                tone="board"
                art="edition"
                title="Nieuwe editie"
                compact
                artFromTablet
            />,
        );
        const inner = container.querySelector('section')?.firstElementChild;

        expect(container.querySelector('section')).toHaveClass('bg-board');
        expect(inner).toHaveClass('md:py-8', 'py-6');
        expect(inner?.lastElementChild).toHaveClass(
            'max-md:hidden',
            'md:max-w-[280px]',
        );
    });
});

describe('TONE_CLASS', () => {
    it('maps each tone to its band colour', () => {
        expect(TONE_CLASS).toEqual({
            board: 'bg-board',
            chance: 'bg-print-chance',
            chest: 'bg-print-chest',
        });
    });
});
