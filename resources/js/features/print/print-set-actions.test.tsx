import { fireEvent, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';

import { renderWithI18n } from '@/testing/render';

import { PrintSetActions } from './print-set-actions';

const props: ComponentProps<typeof PrintSetActions> = {
    set: 'printer',
    allDone: false,
    blocked: false,
    busy: false,
    left: 3,
    onMake: vi.fn(),
    zipReady: false,
    zipUrl: '/zip/printer',
    shareFiles: false,
    files: () => [],
    title: 'Zaterdagclub',
};

describe('PrintSetActions', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('makes the set, and offers the ZIP only once it is ready', () => {
        const onMake = vi.fn();
        renderWithI18n(<PrintSetActions {...props} onMake={onMake} />);

        fireEvent.click(
            screen.getByRole('button', { name: 'Drukkerij-set maken' }),
        );
        expect(onMake).toHaveBeenCalledOnce();
        expect(
            screen.getByRole('button', {
                name: 'Drukkerij-set downloaden (ZIP)',
            }),
        ).toBeDisabled();
    });

    it('says it is busy when nothing is left to add', () => {
        renderWithI18n(<PrintSetActions {...props} left={0} busy />);

        expect(screen.getByRole('button', { name: 'Bezig…' })).toBeDisabled();
    });

    it('waits for the order sheet, then links the ZIP (R5-25)', () => {
        const { unmount } = renderWithI18n(
            <PrintSetActions {...props} allDone left={0} />,
        );
        expect(
            screen.getByRole('button', { name: /ZIP klaarmaken/ }),
        ).toBeDisabled();
        unmount();

        renderWithI18n(
            <PrintSetActions {...props} allDone left={0} zipReady />,
        );
        expect(
            screen.getByRole('link', {
                name: 'Drukkerij-set downloaden (ZIP)',
            }),
        ).toHaveAttribute('href', '/zip/printer');
    });

    it('shares the set file by file where the phone can (R5-30)', () => {
        renderWithI18n(
            <PrintSetActions
                {...props}
                allDone
                left={0}
                zipReady
                shareFiles
                files={() => [{ url: '/dl/board', name: 'board.pdf' }]}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Alles delen' }),
        ).toBeInTheDocument();
    });
});
