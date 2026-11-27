import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditorHeader } from '@/features/edition/editor/editor-header';
import { mediaQueryList } from '@/testing/media-query';
import { renderWithI18n } from '@/testing/render';

describe('NameMenuItems (B144)', () => {
    it('opens the name menu with the actions on the whole edition (B144)', async () => {
        const user = userEvent.setup();
        const menu = {
            onSettings: vi.fn(),
            onCollect: vi.fn(),
            collectCount: 3,
            onShortcuts: vi.fn(),
            onDuplicate: vi.fn(),
            onShare: vi.fn(),
        };

        renderWithI18n(<EditorHeader editionName="Zaterdagclub" menu={menu} />);
        const name = screen.getByRole('button', {
            name: 'Menu van Zaterdagclub, er wachten bijdragen van vrienden',
        });
        expect(name.querySelector('[data-waiting-dot]')).not.toBeNull();

        await user.click(name);
        const items = await screen.findAllByRole('menuitem');
        expect(items.map((item) => item.textContent)).toEqual([
            'Editie-instellingenE',
            "Samen makenVrienden sturen namen en foto's3 nieuw",
            'Sneltoetsen?',
            'Deel je bordEen plaatje voor de groepsapp',
            'DuplicerenKopie voor een andere groep of klas',
            'Naar Mijn edities',
        ]);

        await user.click(screen.getByRole('menuitem', { name: /Samen maken/ }));
        expect(menu.onCollect).toHaveBeenCalledOnce();

        // "Deel je bord" lives in the name menu (B202).
        await user.click(name);
        await user.click(
            await screen.findByRole('menuitem', { name: /Deel je bord/ }),
        );
        expect(menu.onShare).toHaveBeenCalledOnce();
    });

    it('has "Alle namen op het bord leegmaken" for the whole board, only when there is something to clear (R6 Sara, B258)', async () => {
        const user = userEvent.setup();
        const onClearNames = vi.fn();

        const first = renderWithI18n(
            <EditorHeader
                editionName="Zaterdagclub"
                menu={{ onDuplicate: vi.fn(), onClearNames }}
            />,
        );
        await user.click(
            screen.getByRole('button', { name: 'Menu van Zaterdagclub' }),
        );
        await user.click(
            await screen.findByRole('menuitem', {
                name: /Alle namen op het bord leegmaken/,
            }),
        );
        expect(onClearNames).toHaveBeenCalledOnce();
        first.unmount();

        renderWithI18n(
            <EditorHeader
                editionName="Zaterdagclub"
                menu={{ onDuplicate: vi.fn() }}
            />,
        );
        await user.click(
            screen.getByRole('button', { name: 'Menu van Zaterdagclub' }),
        );
        await screen.findAllByRole('menuitem');
        expect(
            screen.queryByRole('menuitem', { name: /namen op het bord/ }),
        ).toBeNull();
    });

    it('says nothing about keys on a touch screen without a keyboard (Gerda, Emma: R5-18)', async () => {
        const user = userEvent.setup();
        const touch = vi
            .spyOn(window, 'matchMedia')
            .mockImplementation((query: string) =>
                mediaQueryList(query, query.includes('hover: none')),
            );
        const menu = {
            onSettings: vi.fn(),
            onShortcuts: vi.fn(),
            onDuplicate: vi.fn(),
        };

        renderWithI18n(<EditorHeader editionName="Zaterdagclub" menu={menu} />);
        await user.click(
            screen.getByRole('button', { name: 'Menu van Zaterdagclub' }),
        );
        const items = await screen.findAllByRole('menuitem');

        expect(items.map((item) => item.textContent)).toEqual([
            'Editie-instellingen',
            'DuplicerenKopie voor een andere groep of klas',
            'Naar Mijn edities',
        ]);
        touch.mockRestore();
    });
});
