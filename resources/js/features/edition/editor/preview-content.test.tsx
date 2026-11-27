import { fireEvent, screen } from '@testing-library/react';

import { resolveEdition } from '@/lib/render/edition-resolve';
import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { PreviewBoard, PreviewItems } from './preview-content';

const edition = sampleEdition({
    parts: { money: true, pawns: true, boxLid: true },
});
const resolved = resolveEdition(edition);

describe('PreviewBoard', () => {
    it('opens the space that was clicked, and nothing next to the spaces', () => {
        const onJump = vi.fn();
        const { container } = renderWithI18n(
            <PreviewBoard
                width={400}
                resolved={resolved}
                photos={new Map()}
                onJump={onJump}
            />,
        );

        fireEvent.click(container.firstElementChild ?? container);
        fireEvent.click(
            container.querySelector('[data-position="12"]') ?? container,
        );

        expect(onJump).toHaveBeenCalledTimes(1);
        expect(onJump).toHaveBeenCalledWith('space.12');
    });
});

describe('PreviewItems', () => {
    it.each([
        ['money', 'note.1'],
        ['pawns', 'pawn.01'],
        ['box', 'box_lid'],
        ['deeds', 'deed.01'],
        ['cards', 'card.chance.01'],
        ['houseRules', 'house_rules'],
        ['invitation', 'invitation'],
    ] as const)('lists the items of %s that open in the editor', (tab, key) => {
        const onJump = vi.fn();
        renderWithI18n(
            <PreviewItems
                active={tab}
                edition={edition}
                resolved={resolved}
                photos={new Map()}
                onJump={onJump}
            />,
        );

        fireEvent.click(screen.getAllByRole('button')[0] ?? document.body);

        expect(onJump).toHaveBeenCalledWith(key);
    });
});
