import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Ornament } from './card-look-ornament';

describe('Ornament', () => {
    it('stays vector on screen, with a clip path for a clipped shape', () => {
        const { container } = render(
            <Ornament
                x={0}
                y={0}
                w={20}
                h={10}
                slot="rope"
                items={[
                    { d: 'M0 0L20 10', stroke: '#000', widthMm: 0.2 },
                    {
                        d: 'M0 10L20 0',
                        fill: '#F00',
                        round: true,
                        clip: { x: 0, y: 0, w: 10, h: 10 },
                    },
                ]}
            />,
        );
        const paths = container.querySelectorAll('path');

        expect(container.querySelector('[data-slot="rope"]')).not.toBeNull();
        expect(container.querySelector('img')).toBeNull();
        expect(paths).toHaveLength(2);
        expect(paths[0]?.getAttribute('fill')).toBe('none');
        expect(paths[1]?.getAttribute('clip-path')).toBe('url(#rope-clip-1)');
        expect(paths[1]?.getAttribute('stroke-linecap')).toBe('round');
        expect(container.querySelector('clipPath')?.id).toBe('rope-clip-1');
    });
});
