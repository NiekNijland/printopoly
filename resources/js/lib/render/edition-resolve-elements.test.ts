import { describe, expect, it } from 'vitest';
import { makeEdition, photo } from '../../testing/edition-test-utils';
import { updateElement } from './edition-changes';
import {
    base,
    boxLid,
    cardBack,
    center,
    free,
    lidShowsLogo,
    textOrUndefined,
    townOf,
} from './edition-resolve-elements';
import type { Edition } from './edition-types';

const withOverride = (
    edition: Edition,
    key: string,
    patch: Parameters<typeof updateElement>[2],
): Edition => updateElement(edition, key, patch).edition;

describe('the free elements of a resolved edition', () => {
    it('marks an element with an override as customized and carries its photo', () => {
        const edition = withOverride(makeEdition(), 'space.01', {
            photo: photo(),
            photoStyle: 'full',
        });

        expect(base(edition, 'space.01')).toEqual({
            key: 'space.01',
            customized: true,
            photo: photo(),
            photoStyle: 'full',
        });
        expect(base(edition, 'space.03').customized).toBe(false);
    });

    it('treats a blank text as none', () => {
        expect(textOrUndefined('  ')).toBeUndefined();
        expect(textOrUndefined(undefined)).toBeUndefined();
        expect(textOrUndefined(' a ')).toBe(' a ');
    });

    it('fills the defaults of a free element', () => {
        expect(free(makeEdition(), 'invitation')).toMatchObject({
            titleOffset: 0,
            titleBand: true,
            layers: [],
        });
    });

    it('drops the stored layers of a card back (B203)', () => {
        const edition = withOverride(makeEdition(), 'card_back.chance', {
            layers: [
                { id: 't', kind: 'text', text: 'x', x: 0, y: 0, w: 1, h: 1 },
            ],
        });

        expect(cardBack(edition, 'chance').layers).toEqual([]);
    });

    it('gives the lid the subtitle of the board centre when it has none (B254)', () => {
        const edition = withOverride(makeEdition(), 'board_center', {
            subtitle: 'Ons dorp',
        });

        expect(boxLid(edition).subtitle).toBe('Ons dorp');
        expect(
            boxLid(withOverride(edition, 'box_lid', { subtitle: '' })).subtitle,
        ).toBe('');
    });

    it('shows the logo on the lid only when both hold the same photo (B241)', () => {
        const logo = withOverride(makeEdition(), 'board_center', {
            centerMode: 'logo',
            photo: photo('logo'),
        });

        expect(lidShowsLogo(logo)).toBe(false);
        expect(
            lidShowsLogo(
                withOverride(logo, 'box_lid', { photo: photo('logo') }),
            ),
        ).toBe(true);
        expect(
            lidShowsLogo(
                withOverride(logo, 'box_lid', { photo: photo('other') }),
            ),
        ).toBe(false);
    });

    it('fills the defaults of the board centre', () => {
        expect(center(makeEdition())).toMatchObject({
            mode: 'name',
            titleScale: 1,
            titleHidden: false,
            photoFrame: true,
            place: 'topRight',
            logoTilt: false,
        });
    });

    it('trims the town of a group and treats an empty one as none', () => {
        const edition = withOverride(makeEdition(), 'group.brown', {
            town: '  Delft ',
        });

        expect(townOf(edition, 'brown')).toBe('Delft');
        expect(
            townOf(
                withOverride(edition, 'group.brown', { town: ' ' }),
                'brown',
            ),
        ).toBeUndefined();
    });
});
