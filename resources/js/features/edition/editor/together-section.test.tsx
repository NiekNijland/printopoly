import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CollectionBox } from '@/features/edition/boxes/use-collection-box';
import { fakeCollect, openBox } from '@/features/edition/testing/collect';
import type { Edition } from '@/lib/render/edition-types';
import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { TogetherSection } from './together-section';

const show = (collect: CollectionBox, edition: Edition = sampleEdition()) =>
    renderWithI18n(
        <TogetherSection
            collect={collect}
            edition={edition}
            locale="nl"
            onOpenElement={() => undefined}
        />,
    );

describe('TogetherSection', () => {
    it('refreshes the box when it opens, and says it is busy until the box is loaded', () => {
        const collect = { ...fakeCollect(), loaded: false };
        show(collect);

        expect(collect.refresh).toHaveBeenCalledOnce();
        expect(screen.getByRole('status')).toHaveTextContent('Bezig');
    });

    it('makes a link when there is none, with the reason when it failed', async () => {
        const user = userEvent.setup();
        const collect = {
            ...fakeCollect(),
            error: true,
            errorReason: 'too_many_boxes' as const,
        };
        show(collect);

        await user.click(screen.getByRole('button', { name: 'Maak een link' }));
        expect(collect.start).toHaveBeenCalledOnce();
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Vandaag zijn er vanaf dit netwerk te veel links gemaakt.',
        );
    });

    it('copies the link and says so for a moment', async () => {
        const user = userEvent.setup();
        const writeText = vi
            .spyOn(navigator.clipboard, 'writeText')
            .mockResolvedValue(undefined);
        show(fakeCollect(openBox()));

        expect(screen.getByLabelText('Link voor je vrienden')).toHaveValue(
            'https://printopoly.test/box/abc',
        );
        await user.click(screen.getByRole('button', { name: 'Kopieer link' }));
        expect(writeText).toHaveBeenCalledWith(
            'https://printopoly.test/box/abc',
        );
        expect(
            screen.getByRole('button', { name: 'Gekopieerd' }),
        ).toBeInTheDocument();

        expect(
            await screen.findByRole(
                'button',
                { name: 'Kopieer link' },
                { timeout: 4000 },
            ),
        ).toBeInTheDocument();
    });

    it('shares the link where the browser can, and closes the buttons of a closed link', async () => {
        const user = userEvent.setup();
        const share = vi.fn<(data: ShareData) => Promise<void>>(() =>
            Promise.resolve(),
        );
        Object.defineProperty(navigator, 'share', {
            value: share,
            configurable: true,
        });
        const { unmount } = show(fakeCollect(openBox()));

        await user.click(screen.getByRole('button', { name: 'Deel link' }));
        expect(share).toHaveBeenCalledWith({
            title: 'Zaterdagclub',
            text: 'Help mee met onze eigen editie: Zaterdagclub',
            url: 'https://printopoly.test/box/abc',
        });
        unmount();

        show(fakeCollect(openBox({ status: 'closed' })));
        expect(
            screen.getByRole('button', { name: 'Deel link' }),
        ).toBeDisabled();
        expect(
            screen.getByText(
                'De link is gesloten. Vrienden kunnen niets meer toevoegen.',
            ),
        ).toBeInTheDocument();
        Reflect.deleteProperty(navigator, 'share');
    });

    it('keeps the card texts from friends on request (B176)', async () => {
        const user = userEvent.setup();
        const collect = fakeCollect(openBox());
        show(collect, sampleEdition({ parts: { cards: true } }));

        await user.click(
            screen.getByRole('checkbox', {
                name: /Kaartteksten alleen voor mij/,
            }),
        );
        expect(collect.hideCards).toHaveBeenCalledWith(true);
    });

    it('has no picture for the group chat any more: that is Deel je bord in the name menu (B202)', () => {
        show(fakeCollect(openBox()));

        expect(
            screen.queryByRole('button', { name: 'Maak het plaatje' }),
        ).not.toBeInTheDocument();
    });
});
