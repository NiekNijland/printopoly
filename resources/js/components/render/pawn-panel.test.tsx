import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PanelBackdrop, Portrait, VintagePanelRules } from './pawn-panel';

const photo = { src: 'a.jpg', width: 800, height: 600 };

describe('the panel of a pawn', () => {
    it('lays the paper of a style under the panel', () => {
        const slot = (look: 'vintage' | 'playful', name: string) =>
            render(
                <PanelBackdrop look={look} seed={3} />,
            ).container.querySelector(`[data-slot="${name}"]`);

        expect(slot('vintage', 'vintage-rules')).not.toBeNull();
        expect(slot('playful', 'tile')).not.toBeNull();
    });

    it('edges the portrait in the style, with tape on Speels', () => {
        const playful = render(
            <Portrait photo={photo} look="playful" />,
        ).container;

        expect(
            playful.querySelector('[data-slot="photo-edge"]'),
        ).not.toBeNull();
        expect(playful.querySelector('[data-slot="tape"]')).not.toBeNull();
        expect(playful.querySelector('img')).not.toBeNull();
    });

    it('rules a panel with or without the line between its halves', () => {
        const lines = (split: boolean) =>
            render(
                <VintagePanelRules color="#000" split={split} />,
            ).container.querySelectorAll('line, path, rect').length;

        expect(lines(true)).toBeGreaterThan(lines(false));
    });
});
