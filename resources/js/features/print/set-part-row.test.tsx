import { fireEvent, screen, waitFor } from '@testing-library/react';

import type { PrintSelection } from '@/lib/render/edition-types';
import { jsonOf, requestsOf, stubFetch } from '@/testing/fetch';
import {
    fakePrintServices,
    partRow,
    printJob,
    printPageEdition,
} from '@/testing/print-job';
import { renderWithI18n } from '@/testing/render';

import { CalibrationRow, SetPartRow } from './set-part-row';
import { usePrintPage } from './use-print-page';

const ALL_PARTS: PrintSelection['parts'] = [
    'board',
    'deeds',
    'cards',
    'money',
    'pawns',
    'boxLid',
];

const Harness = ({ asked }: { asked: boolean }) => {
    const page = usePrintPage(
        {
            job: printJob([
                partRow('printer', 'board', 'done', { downloadUrl: '/dl' }),
            ]),
            editionData: null,
            localEditionId: null,
            edition: printPageEdition,
        },
        fakePrintServices(),
        (chosen, _c, _j, _drawn, set) => chosen ?? { set, parts: ALL_PARTS },
    );

    return (
        <ul>
            <CalibrationRow page={page} />
            <SetPartRow
                page={page}
                askedPart={asked ? 'money' : null}
                part="money"
                index={2}
            />
            <SetPartRow page={page} askedPart={null} part="board" index={0} />
        </ul>
    );
};

describe('SetPartRow', () => {
    beforeEach(() => {
        window.history.replaceState(null, '', '/nl/print?set=printer');
    });

    it('shows a part with its spec, its choice and its status (B95, B156)', () => {
        renderWithI18n(<Harness asked />);

        expect(document.getElementById('part-money')).toHaveAttribute(
            'data-asked',
            'true',
        );
        expect(
            screen.getByRole('link', { name: 'PDF van Bord' }),
        ).toHaveAttribute('href', '/dl');
        expect(screen.getByText('Hoeveel geld?')).toBeInTheDocument();
        expect(screen.getByText(/biljetten/)).toBeInTheDocument();
    });

    it('makes a single part and the test sheet from their own buttons', async () => {
        const fetchMock = stubFetch(
            () => new Promise<Response>(() => undefined),
        );
        renderWithI18n(<Harness asked={false} />);

        expect(
            screen.getByRole('button', { name: /Proefvel/ }),
        ).toBeInTheDocument();
        fireEvent.click(
            screen.getByRole('button', { name: 'Alleen dit maken: Speelgeld' }),
        );
        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledOnce();
        });
        expect(jsonOf(requestsOf(fetchMock)[0]?.init ?? {})).toMatchObject({
            parts: ['money'],
        });
    });
});
