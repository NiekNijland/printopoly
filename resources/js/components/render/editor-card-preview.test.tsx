import { render } from '@testing-library/react';

import { resolveEdition } from '@/lib/render/edition-resolve';
import { sampleEdition } from '@/lib/render/sample-edition';

import { CardBackPreview, CardPreview } from './editor-card-preview';
import type { ElementProps } from './sheet';

const resolved = resolveEdition(sampleEdition('nl'));
const common: ElementProps = {
    theme: resolved.theme,
    locale: resolved.language,
};
const part = { resolved, photos: new Map(), common };

describe('the card previews of the editor', () => {
    it('draws the front of a card and nothing for an unknown deck', () => {
        const card = render(
            <CardPreview {...part} target={{ key: 'card.chance.01' }} />,
        ).container;
        const unknown = render(
            <CardPreview {...part} target={{ key: 'card.other.01' }} />,
        ).container;

        expect(card.innerHTML).not.toBe('');
        expect(unknown.innerHTML).toBe('');
    });

    it('draws the back of a deck', () => {
        const { container } = render(
            <CardBackPreview {...part} target={{ key: 'card_back.chest' }} />,
        );

        expect(container.innerHTML).not.toBe('');
    });
});
