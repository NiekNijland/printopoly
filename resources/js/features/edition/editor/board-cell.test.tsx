import { fireEvent, render, screen } from '@testing-library/react';

import { sampleEdition } from '@/testing/editions';

import {
    BoardCell,
    OVERLAY_SELECTED,
    SpaceCellContent,
    spaceCellClass,
} from './board-cell';

const state = {
    key: 'space.03',
    selected: false,
    blocked: false,
    swapFrom: null,
    swapTarget: null,
    drag: null,
};

describe('spaceCellClass', () => {
    it('marks the chosen space, on the mini board and over the real board', () => {
        expect(spaceCellClass(false, { ...state, selected: true })).toContain(
            'outline-ink',
        );
        expect(spaceCellClass(true, { ...state, selected: true })).toContain(
            OVERLAY_SELECTED,
        );
    });

    it('shows a drag: a target of the same kind dashed, another kind refused', () => {
        const drag = { from: 'space.01', over: 'space.05' };

        expect(spaceCellClass(false, { ...state, drag })).toContain(
            'outline-dashed',
        );
        expect(
            spaceCellClass(false, { ...state, key: 'space.05', drag }),
        ).toContain('outline-solid');
        expect(
            spaceCellClass(true, { ...state, key: 'space.01', drag }),
        ).toContain('bg-paper/50');
        expect(
            spaceCellClass(true, { ...state, key: 'space.05', drag }),
        ).toContain('bg-ink/40');
    });

    it('shows the keyboard swap and a space that cannot be chosen', () => {
        expect(
            spaceCellClass(false, { ...state, swapTarget: 'space.03' }),
        ).toContain('outline-press');
        expect(
            spaceCellClass(false, { ...state, swapFrom: 'space.03' }),
        ).toContain('opacity-60');
        expect(spaceCellClass(true, { ...state, blocked: true })).toContain(
            'cursor-not-allowed',
        );
    });
});

describe('BoardCell', () => {
    const show = (extra: { blocked?: boolean; swapping?: boolean } = {}) => {
        const onClick = vi.fn<() => void>();
        const onChoose = vi.fn<() => void>();
        render(
            <BoardCell
                cellKey="space.03"
                className="cell"
                style={{}}
                selected
                blocked={extra.blocked ?? false}
                label="Veldweg"
                swapping={extra.swapping ?? false}
                onClick={onClick}
                onChoose={onChoose}
                onPress={() => undefined}
            >
                x
            </BoardCell>,
        );

        return { onClick, onChoose, option: screen.getByRole('option') };
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

describe('SpaceCellContent', () => {
    it('draws the band, the photo, the changed dot and the warning on the mini board', () => {
        const edition = sampleEdition();
        const { container } = render(
            <SpaceCellContent
                position={1}
                color="#f00"
                edition={{
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
                }}
                photos={
                    new Map([
                        [
                            'p1',
                            {
                                id: 'p1',
                                url: 'blob:p1',
                                width: 8,
                                height: 6,
                            },
                        ],
                    ])
                }
                overlay={false}
                customized
                warned
            />,
        );

        expect(screen.getByTestId('mini-space-photo')).toHaveStyle({
            filter: 'grayscale(1)',
        });
        expect(container.querySelector('.bg-ink')).toHaveClass('size-1.5');
        expect(container.querySelector('svg')).toHaveClass('top-0');
    });

    it('draws only the marks over the real board', () => {
        const { container } = render(
            <SpaceCellContent
                position={1}
                color={null}
                edition={sampleEdition()}
                photos={undefined}
                overlay
                customized
                warned={false}
            />,
        );

        expect(screen.queryByTestId('mini-space-photo')).toBeNull();
        expect(container.querySelector('.bg-ink')).toHaveClass('size-2.5');
    });
});
