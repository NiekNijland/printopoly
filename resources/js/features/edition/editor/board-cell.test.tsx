import { fireEvent, render, screen } from '@testing-library/react';

import { spaceAt } from '@/lib/render/standard-edition';
import { sampleEdition } from '@/testing/editions';

import { SpaceCell, type CellContext } from './board-cell';

const OVERLAY_SELECTED =
    'z-10 outline-4 -outline-offset-4 outline-ink shadow-[inset_0_0_0_7px_var(--color-paper)]';

type Swap = CellContext['swap'];

const contextWith = (
    extra: Partial<Omit<CellContext, 'swap'>> & {
        swap?: Partial<Swap>;
    } = {},
): CellContext => ({
    selected: '',
    overlay: false,
    edition: sampleEdition(),
    photos: undefined,
    warned: new Set(),
    blocked: () => false,
    describe: () => 'Veldweg',
    onSelect: vi.fn<CellContext['onSelect']>(),
    ...extra,
    swap: {
        swapFrom: null,
        swapTarget: null,
        drag: null,
        consumeDrag: vi.fn<Swap['consumeDrag']>(() => false),
        pressCell: vi.fn<Swap['pressCell']>(),
        ...extra.swap,
    },
});

const cell = (position: number, context: CellContext) =>
    render(<SpaceCell space={spaceAt(position)} context={context} />);

const classOf = (
    position: number,
    extra: Parameters<typeof contextWith>[0] = {},
) =>
    cell(position, contextWith(extra)).container.querySelector(
        '[role="option"]',
    )?.className;

describe('the class of a space cell', () => {
    it('marks the chosen space, on the mini board and over the real board', () => {
        expect(classOf(3, { selected: 'space.03' })).toContain('outline-ink');
        expect(classOf(3, { selected: 'space.03', overlay: true })).toContain(
            OVERLAY_SELECTED,
        );
    });

    it('shows a drag: a target of the same kind dashed, another kind refused', () => {
        const drag = { from: 'space.01', over: 'space.05' };
        const classes = [
            classOf(3, { swap: { drag } }),
            classOf(5, { swap: { drag } }),
            classOf(1, { overlay: true, swap: { drag } }),
            classOf(5, { overlay: true, swap: { drag } }),
        ];

        expect(classes[0]).toContain('outline-dashed');
        expect(classes[1]).toContain('outline-solid');
        expect(classes[2]).toContain('bg-paper/50');
        expect(classes[3]).toContain('bg-ink/40');
    });

    it('shows the keyboard swap and a space that cannot be chosen', () => {
        expect(classOf(3, { swap: { swapTarget: 'space.03' } })).toContain(
            'outline-press',
        );
        expect(classOf(3, { swap: { swapFrom: 'space.03' } })).toContain(
            'opacity-60',
        );
        expect(classOf(3, { overlay: true, blocked: () => true })).toContain(
            'cursor-not-allowed',
        );
    });
});

describe('the option of a space cell', () => {
    const show = (extra: { blocked?: boolean; swapping?: boolean } = {}) => {
        const onSelect = vi.fn<CellContext['onSelect']>();
        const consumeDrag = vi.fn<Swap['consumeDrag']>(() => true);
        cell(
            3,
            contextWith({
                selected: 'space.03',
                blocked: () => extra.blocked ?? false,
                onSelect,
                swap: {
                    consumeDrag,
                    swapFrom: extra.swapping === true ? 'space.01' : null,
                },
            }),
        );

        return {
            onClick: consumeDrag,
            onChoose: onSelect,
            option: screen.getByRole('option', { name: 'Veldweg' }),
        };
    };

    it('is an option that Enter and Space choose', () => {
        const { onClick, onChoose, option } = show();

        expect(option).toHaveAttribute('tabindex', '0');
        fireEvent.keyDown(option, { key: 'Enter' });
        fireEvent.keyDown(option, { key: ' ' });
        fireEvent.click(option);

        expect(onChoose).toHaveBeenCalledTimes(2);
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('leaves the keys to a running swap and to nobody on a blocked space', () => {
        const swapping = show({ swapping: true });
        fireEvent.keyDown(swapping.option, { key: 'Enter' });
        expect(swapping.onChoose).not.toHaveBeenCalled();
    });

    it('chooses nothing with the keys on a space that cannot be chosen', () => {
        const blocked = show({ blocked: true });
        fireEvent.keyDown(blocked.option, { key: 'Enter' });
        expect(blocked.onChoose).not.toHaveBeenCalled();
        expect(blocked.option).toHaveAttribute('aria-disabled', 'true');
    });
});

describe('the content of a space cell', () => {
    it('draws the band, the photo, the changed dot and the warning on the mini board', () => {
        const edition = sampleEdition();
        const { container } = cell(
            1,
            contextWith({
                edition: {
                    ...edition,
                    elements: {
                        'space.01': {
                            photo: {
                                photoId: 'p1',
                                cx: 0.5,
                                cy: 0.5,
                                scale: 1,
                                rotation: 0,
                                grayscale: true,
                            },
                        },
                    },
                },
                photos: new Map([
                    [
                        'p1',
                        {
                            id: 'p1',
                            url: 'blob:p1',
                            width: 8,
                            height: 6,
                        },
                    ],
                ]),
                warned: new Set(['space.01']),
            }),
        );

        expect(screen.getByTestId('mini-space-photo')).toHaveStyle({
            filter: 'grayscale(1)',
        });
        expect(container.querySelector('.bg-ink')).toHaveClass('size-1.5');
        expect(container.querySelector('svg')).toHaveClass('top-0');
    });

    it('draws only the marks over the real board', () => {
        const edition = sampleEdition();
        const { container } = cell(
            1,
            contextWith({
                overlay: true,
                edition: {
                    ...edition,
                    elements: { 'space.01': { name: 'Dorpsstraat' } },
                },
            }),
        );

        expect(screen.queryByTestId('mini-space-photo')).toBeNull();
        expect(container.querySelector('.bg-ink')).toHaveClass('size-2.5');
    });
});
