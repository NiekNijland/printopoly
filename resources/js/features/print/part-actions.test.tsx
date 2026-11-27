import { fireEvent, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';

import { partRow } from '@/testing/print-job';
import { renderWithI18n } from '@/testing/render';

import { PartActions } from './part-actions';

const props: ComponentProps<typeof PartActions> = {
    part: 'money',
    name: 'Speelgeld',
    row: undefined,
    status: 'idle',
    skipped: false,
    inLine: false,
    trial: false,
    disabled: false,
    shareFiles: false,
    guideHref: '/nl/printgids#part-money',
    onMake: () => undefined,
    onUnqueue: () => undefined,
};

describe('PartActions', () => {
    it('makes a part and links its section of the guide (R6 Tom, B205)', () => {
        const onMake = vi.fn();
        renderWithI18n(<PartActions {...props} onMake={onMake} />);

        fireEvent.click(
            screen.getByRole('button', { name: 'Alleen dit maken: Speelgeld' }),
        );
        expect(onMake).toHaveBeenCalledOnce();
        expect(
            screen.getByRole('link', {
                name: 'Hoe het werkt: Speelgeld, in de printgids',
            }),
        ).toHaveAttribute('href', '/nl/printgids#part-money');
    });

    it('takes a part out of the line, and retries a failed one', () => {
        const onUnqueue = vi.fn();
        const { unmount } = renderWithI18n(
            <PartActions {...props} inLine onUnqueue={onUnqueue} />,
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Toch niet: Speelgeld' }),
        );
        expect(onUnqueue).toHaveBeenCalledOnce();
        expect(screen.queryByRole('button', { name: /maken/ })).toBeNull();
        unmount();

        renderWithI18n(<PartActions {...props} status="failed" />);
        expect(
            screen.getByRole('button', { name: 'Opnieuw proberen: Speelgeld' }),
        ).toBeEnabled();
    });

    it('offers the PDF of a finished part, and the picture where the phone can share it (R6 Sara)', () => {
        const row = partRow('home', 'invitation', 'done', {
            downloadUrl: '/dl/inv',
            imageUrl: '/img/inv',
        });
        renderWithI18n(
            <PartActions
                {...props}
                part="invitation"
                name="Uitnodiging"
                row={row}
                status="done"
                shareFiles
            />,
        );

        expect(
            screen.getByRole('link', { name: 'PDF van Uitnodiging' }),
        ).toHaveAttribute('href', '/dl/inv');
        expect(
            screen.getByRole('button', { name: 'Plaatje delen: Uitnodiging' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'PDF delen: Uitnodiging' }),
        ).toBeNull();
    });
});
