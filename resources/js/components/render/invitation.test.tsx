import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { INVITATION_HEAD, INVITATION_KICKER, Invitation } from './invitation';

const slot = (container: HTMLElement, name: string) =>
    container.querySelector<HTMLElement>(`[data-slot="${name}"]`);

describe('Invitation', () => {
    it('invites to a game night with lines to fill in and the little board of the edition', () => {
        const { container } = render(
            <Invitation
                text="  "
                editionName="Zaterdagclub"
                theme="classic"
                locale="nl"
            />,
        );
        const card = container.querySelector<HTMLElement>(
            '[data-element="invitation"]',
        );

        expect(card?.style.width).toBe('105mm');
        expect(card?.style.height).toBe('148mm');
        expect(slot(container, 'invitation-kicker')).toHaveTextContent(
            'Spelavond',
        );
        expect(slot(container, 'invitation-title')).toHaveTextContent(
            'Je bent uitgenodigd',
        );
        expect(slot(container, 'invitation-title')?.style.top).toBe('13.5mm');
        expect(slot(container, 'invitation-edition')).toHaveTextContent(
            'Zaterdagclub',
        );
        expect(slot(container, 'invitation-text')?.textContent).toBe(
            'Wanneer: …………………………\nWaar: …………………………\nNeem mee: …………………………',
        );
        expect(
            container.querySelector('[data-element="board"]'),
        ).not.toBeNull();
        expect(container.querySelector('[data-photo]')).toBeNull();
    });

    it('says its own words, with a photo above them', () => {
        const { container } = render(
            <Invitation
                text={'Zaterdag 8 uur\nBij Kees'}
                editionName="Club"
                headline="Kom spelen"
                kicker="Feest"
                photo={{ src: 'party.jpg' }}
                theme="riso"
                locale="en"
            />,
        );

        expect(slot(container, 'invitation-kicker')).toHaveTextContent('Feest');
        expect(slot(container, 'invitation-kicker')?.style.top).toBe('37mm');
        expect(slot(container, 'invitation-title')).toHaveTextContent(
            'Kom spelen',
        );
        expect(slot(container, 'invitation-title')?.style.top).toBe('41.5mm');
        expect(slot(container, 'invitation-text')?.textContent).toBe(
            'Zaterdag 8 uur\nBij Kees',
        );
        expect(container.querySelector('[data-photo] img')).toHaveAttribute(
            'src',
            'party.jpg',
        );
    });

    it('falls back to the standard headline in English and leaves out an empty kicker', () => {
        const { container } = render(
            <Invitation
                text=""
                editionName="Club"
                headline=" "
                kicker=""
                theme="strak"
                locale="en"
            />,
        );

        expect(slot(container, 'invitation-title')).toHaveTextContent(
            INVITATION_HEAD.en,
        );
        expect(slot(container, 'invitation-kicker')).toBeNull();
        expect(slot(container, 'invitation-text')?.textContent).toBe(
            'When: …………………………\nWhere: …………………………\nBring: …………………………',
        );
    });

    it('writes the edition name in the script of Gala', () => {
        const { container } = render(
            <Invitation text="x" editionName="Gala" theme="gala" locale="nl" />,
        );
        const name = slot(container, 'invitation-edition');

        expect(
            name?.firstElementChild instanceof HTMLElement
                ? name.firstElementChild.style.fontFamily
                : '',
        ).toContain('Great Vibes');
        expect(container.querySelector('[data-ornament]')).not.toBeNull();
    });

    it('draws the real board of the edition when it has one', () => {
        const { container } = render(
            <Invitation
                text="x"
                editionName="Zaterdagclub"
                board={{
                    theme: 'classic',
                    locale: 'nl',
                    editionName: 'Ons bord',
                    spaces: { 1: { name: 'Thuisweg' } },
                }}
                theme="classic"
                locale="nl"
            />,
        );
        const board = container.querySelector('[data-element="board"]');

        expect(board?.textContent).toContain('Ons bord');
        expect((board?.textContent ?? '').toLowerCase()).toContain('thuisweg');
    });
});

describe('INVITATION_HEAD and INVITATION_KICKER', () => {
    it('name the standard lines in both languages', () => {
        expect(INVITATION_HEAD).toEqual({
            nl: 'Je bent uitgenodigd',
            en: 'You are invited',
        });
        expect(INVITATION_KICKER).toEqual({
            nl: 'Spelavond',
            en: 'Game night',
        });
    });
});
