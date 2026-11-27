import { render } from '@testing-library/react';

import { resolveEdition } from '@/lib/render/edition-resolve';
import { sampleEdition } from '@/lib/render/sample-edition';

import {
    DeedPreview,
    DeedSpread,
    SPREAD_GAP,
    SpacePreview,
} from './editor-deed-preview';
import type { ElementProps } from './sheet';

const resolved = resolveEdition(sampleEdition('nl'));
const common: ElementProps = {
    theme: resolved.theme,
    locale: resolved.language,
};
const part = { resolved, photos: new Map(), common };

describe('the deed and space previews of the editor', () => {
    it('shows a deed with a story front and back side by side', () => {
        const { container } = render(
            <DeedSpread story="Een verhaal">
                {(side) => <span data-side={side} />}
            </DeedSpread>,
        );

        expect(SPREAD_GAP).toBe(6);
        expect(
            [...container.querySelectorAll('[data-side]')].map((node) =>
                node.getAttribute('data-side'),
            ),
        ).toEqual(['front', 'back']);
    });

    it('draws a space, or its deed when asked', () => {
        const space = render(
            <SpacePreview {...part} target={{ key: 'space.1' }} />,
        ).container;
        const deed = render(
            <SpacePreview {...part} target={{ key: 'space.1', deed: true }} />,
        ).container;

        expect(
            space.querySelector('[data-element="space-street"]'),
        ).not.toBeNull();
        expect(deed.querySelector('[data-element="space-street"]')).toBeNull();
        expect(deed.textContent).not.toBe('');
    });

    it('draws nothing for a deed that does not exist', () => {
        const { container } = render(
            <DeedPreview {...part} target={{ key: 'deed.99' }} />,
        );

        expect(container.innerHTML).toBe('');
    });
});
