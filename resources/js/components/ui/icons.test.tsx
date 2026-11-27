import { render } from '@testing-library/react';
import type { ComponentType } from 'react';
import { describe, expect, it } from 'vitest';

import {
    CheckIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    CloseIcon,
    CopyIcon,
    FitIcon,
    FolderIcon,
    HandIcon,
    MenuIcon,
    MinusIcon,
    MoreIcon,
    PhotosIcon,
    PlusIcon,
    RedoIcon,
    SearchIcon,
    SwapIcon,
    UndoIcon,
    WarningIcon,
    ZoomIcon,
} from '@/components/ui/icons';

type IconProps = { size?: number; className?: string };

const icons: [string, ComponentType<IconProps>, number][] = [
    ['ChevronLeftIcon', ChevronLeftIcon, 1],
    ['CheckIcon', CheckIcon, 1],
    ['ChevronDownIcon', ChevronDownIcon, 1],
    ['UndoIcon', UndoIcon, 1],
    ['RedoIcon', RedoIcon, 1],
    ['WarningIcon', WarningIcon, 2],
    ['HandIcon', HandIcon, 3],
    ['CloseIcon', CloseIcon, 1],
    ['MoreIcon', MoreIcon, 3],
    ['ZoomIcon', ZoomIcon, 2],
    ['PlusIcon', PlusIcon, 1],
    ['MinusIcon', MinusIcon, 1],
    ['FitIcon', FitIcon, 1],
    ['SearchIcon', SearchIcon, 2],
    ['MenuIcon', MenuIcon, 1],
    ['FolderIcon', FolderIcon, 1],
    ['CopyIcon', CopyIcon, 2],
    ['PhotosIcon', PhotosIcon, 4],
    ['SwapIcon', SwapIcon, 2],
];

const svgOf = (container: HTMLElement): SVGSVGElement => {
    const svg = container.querySelector('svg');
    if (svg === null) {
        throw new Error('no svg');
    }

    return svg;
};

describe('icons', () => {
    it.each(icons)(
        '%s draws a decorative 20 px stroke icon',
        (_name, Icon, shapes) => {
            const { container } = render(<Icon />);
            const svg = svgOf(container);

            expect(svg).toHaveAttribute('width', '20');
            expect(svg).toHaveAttribute('height', '20');
            expect(svg).toHaveAttribute('viewBox', '0 0 20 20');
            expect(svg).toHaveAttribute('aria-hidden', 'true');
            expect(svg).toHaveAttribute('fill', 'none');
            expect(svg).toHaveAttribute('stroke', 'currentColor');
            expect(svg).toHaveAttribute('stroke-width', '1.75');
            expect(svg).toHaveAttribute('stroke-linecap', 'round');
            expect(svg.children).toHaveLength(shapes);
        },
    );

    it('takes another size and passes other props on', () => {
        const { container } = render(
            <PlusIcon size={32} className="text-press" />,
        );
        const svg = svgOf(container);

        expect(svg).toHaveAttribute('width', '32');
        expect(svg).toHaveAttribute('height', '32');
        expect(svg).toHaveClass('text-press');
    });

    it('draws the warning triangle with square ends', () => {
        const { container } = render(<WarningIcon />);

        expect(svgOf(container).querySelector('path')).toHaveAttribute(
            'stroke-linecap',
            'butt',
        );
    });
});
