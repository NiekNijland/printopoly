import { render } from '@testing-library/react';

import { resolveEdition } from '@/lib/render/edition-resolve';
import type { PageItem } from '@/lib/render/print-composition';
import { allPartsOn } from '@/lib/render/print-edition';
import { sampleEdition } from '@/lib/render/sample-edition';

import type { ArtKit } from './print-art-kit';
import {
    BookletArt,
    BoxLidArt,
    InvitationArt,
    NoteArt,
    PawnArt,
} from './print-sheet-art';

const edition = allPartsOn(sampleEdition('nl'));
const resolved = resolveEdition(edition);
const kit: ArtKit = {
    ctx: { edition, resolved, set: 'printer' },
    photo: () => undefined,
    icon: () => undefined,
    layers: () => [],
};
const item = (
    id: string,
    kind: PageItem['kind'],
    elementKey: string | null,
): PageItem => ({
    id,
    kind,
    elementKey,
    label: id,
    bleed: { x: 0, y: 0, w: 0, h: 0 },
    trim: { x: 0, y: 0, w: 0, h: 0 },
});

describe('the sheet art of the print', () => {
    it('draws a banknote of a value the edition has, and nothing for another', () => {
        const value = resolved.money?.notes[0]?.value ?? 0;

        expect(
            render(
                <NoteArt
                    kit={kit}
                    item={item('n', 'note', `note.${String(value)}`)}
                />,
            ).container.querySelector('[data-element="banknote"]'),
        ).not.toBeNull();
        expect(
            render(<NoteArt kit={kit} item={item('n', 'note', 'note.3')} />)
                .container.innerHTML,
        ).toBe('');
    });

    it('draws a pawn, the box lid, a booklet page and the invitation', () => {
        const pawn = render(
            <PawnArt kit={kit} item={item('p', 'token', 'pawn.1')} />,
        ).container;
        const lid = render(
            <BoxLidArt kit={kit} item={item('box', 'box-lid', 'box_lid')} />,
        ).container;
        const booklet = render(
            <BookletArt
                kit={kit}
                item={item('booklet.2', 'booklet-page', 'rules_booklet')}
            />,
        ).container;
        const invitation = render(<InvitationArt kit={kit} />).container;

        expect(pawn.innerHTML).not.toBe('');
        expect(lid.querySelector('[data-element="box-lid"]')).not.toBeNull();
        expect(
            booklet.querySelector('[data-element="rules-booklet"]'),
        ).not.toBeNull();
        expect(invitation.innerHTML).not.toBe('');
    });
});
