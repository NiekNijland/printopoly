import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Stage, TableItem } from './table-stage';

const observe = () => {
    let report: () => void = () => undefined;
    const disconnect = vi.fn<() => void>();
    vi.stubGlobal(
        'ResizeObserver',
        class {
            constructor(callback: () => void) {
                report = callback;
            }

            observe = vi.fn<(target: Element) => void>();

            disconnect = disconnect;
        },
    );

    return { resize: () => report(), disconnect };
};

const boxWidth = (width: number) =>
    vi
        .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
        .mockReturnValue(width);

describe('Stage', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('stays at design size in a box that is wide enough', () => {
        observe();
        boxWidth(800);
        render(
            <Stage width={400} height={250} className="extra">
                <span>tafel</span>
            </Stage>,
        );
        const inner = screen.getByText('tafel').parentElement;
        const outer = inner?.parentElement;

        expect(inner?.style.transform).toBe('scale(1)');
        expect(inner).toHaveStyle({ width: '400px', height: '250px' });
        expect(outer).toHaveStyle({ maxWidth: '400px', height: '250px' });
        expect(outer).toHaveClass('extra');
        expect(outer).toHaveAttribute('aria-hidden', 'true');
    });

    it('shrinks to a narrow box and follows it when it resizes', () => {
        const { resize } = observe();
        const width = boxWidth(200);
        render(
            <Stage width={400} height={250}>
                <span>tafel</span>
            </Stage>,
        );
        const inner = screen.getByText('tafel').parentElement;

        expect(inner?.style.transform).toBe('scale(0.5)');
        expect(inner?.parentElement).toHaveStyle({ height: '125px' });

        width.mockReturnValue(100);
        act(() => resize());

        expect(inner?.style.transform).toBe('scale(0.25)');
    });

    it('stops watching the box when it goes', () => {
        const { disconnect } = observe();
        boxWidth(400);
        const { unmount } = render(
            <Stage width={400} height={250}>
                <span />
            </Stage>,
        );

        unmount();

        expect(disconnect).toHaveBeenCalledOnce();
    });
});

describe('TableItem', () => {
    it('lies on the table at its place, turned and settling after its delay', () => {
        render(
            <TableItem
                left={10}
                top={20}
                rotate={-4}
                delay={0.3}
                z={3}
                className="shadow"
            >
                <span>kaart</span>
            </TableItem>,
        );
        const item = screen.getByText('kaart').parentElement;

        expect(item).toHaveClass('table-item', 'absolute', 'shadow');
        expect(item).toHaveAttribute('data-settle', '');
        expect(item).toHaveStyle({ left: '10px', top: '20px', zIndex: '3' });
        expect(item?.style.getPropertyValue('--rot')).toBe('-4deg');
        expect(item?.style.getPropertyValue('--delay')).toBe('0.3s');
    });

    it('lies straight and first without its own settings', () => {
        render(
            <TableItem left={0} top={0}>
                <span>biljet</span>
            </TableItem>,
        );
        const item = screen.getByText('biljet').parentElement;

        expect(item?.style.getPropertyValue('--rot')).toBe('0deg');
        expect(item?.style.getPropertyValue('--delay')).toBe('0s');
        expect(item).toHaveStyle({ zIndex: '1' });
    });
});
