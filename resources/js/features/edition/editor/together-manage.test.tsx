import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { fakeCollect, openBox } from '@/features/edition/testing/collect';
import { renderWithI18n } from '@/testing/render';

import { TogetherManage } from './together-manage';

describe('TogetherManage', () => {
    it('asks before making a new link (B175)', async () => {
        const user = userEvent.setup();
        const collect = fakeCollect(openBox());
        renderWithI18n(
            <TogetherManage collect={collect} closed={false} failed={null} />,
        );

        await user.click(screen.getByRole('button', { name: 'Nieuwe link' }));
        expect(collect.renew).not.toHaveBeenCalled();
        const question = screen.getByRole('alertdialog', {
            name: 'Nieuwe link',
        });
        expect(question).toHaveClass('border-ink');
        await user.click(
            within(question).getByRole('button', { name: 'Ja, nieuwe link' }),
        );
        expect(collect.renew).toHaveBeenCalledOnce();
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('asks before deleting everything, and cancels without a word', async () => {
        const user = userEvent.setup();
        const collect = fakeCollect(openBox());
        renderWithI18n(
            <TogetherManage collect={collect} closed={false} failed={null} />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Alles verwijderen' }),
        );
        const question = screen.getByRole('alertdialog', {
            name: 'Alles verwijderen',
        });
        expect(question).toHaveClass('border-press');
        expect(
            within(question).getByText(
                'Alle bijdragen en de link verwijderen? Dit kan niet terug.',
            ),
        ).toBeInTheDocument();
        await user.click(
            within(question).getByRole('button', { name: 'Annuleren' }),
        );
        expect(collect.remove).not.toHaveBeenCalled();

        await user.click(
            screen.getByRole('button', { name: 'Alles verwijderen' }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Ja, verwijderen' }),
        );
        expect(collect.remove).toHaveBeenCalledOnce();
    });

    it('closes an open link at once, and offers no close for a closed one', async () => {
        const user = userEvent.setup();
        const collect = fakeCollect(openBox());
        const { unmount } = renderWithI18n(
            <TogetherManage collect={collect} closed={false} failed={null} />,
        );

        await user.click(screen.getByRole('button', { name: 'Link sluiten' }));
        expect(collect.close).toHaveBeenCalledOnce();
        unmount();

        renderWithI18n(
            <TogetherManage
                collect={collect}
                closed
                failed="Dat lukte niet."
            />,
        );
        expect(
            screen.queryByRole('button', { name: 'Link sluiten' }),
        ).not.toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent('Dat lukte niet.');
    });
});
