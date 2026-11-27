import { screen } from '@testing-library/react';

import type { PrintSelection } from '@/lib/render/edition-types';
import {
    fakePrintServices,
    partRow,
    printJob,
    printPageEdition,
} from '@/testing/print-job';
import { renderWithI18n } from '@/testing/render';
import type { PrintJobData } from '@/types/generated';

import { PrintPageBar } from './print-page-bar';
import { usePrintPage } from './use-print-page';

const ALL_PARTS: PrintSelection['parts'] = [
    'board',
    'deeds',
    'cards',
    'money',
    'pawns',
    'boxLid',
];

const Harness = ({ job, anyMade }: { job: PrintJobData; anyMade: boolean }) => {
    const page = usePrintPage(
        {
            job,
            editionData: null,
            localEditionId: null,
            edition: printPageEdition,
        },
        fakePrintServices(),
        (chosen, _c, _j, _drawn, set) => chosen ?? { set, parts: ALL_PARTS },
    );

    return <PrintPageBar page={page} anyMade={anyMade} issues={[]} />;
};

describe('PrintPageBar', () => {
    beforeEach(() => {
        window.history.replaceState(null, '', '/nl/print?set=printer');
    });

    it('explains the server before anything is made, with the estimate and the progress (B95, UX 3)', () => {
        renderWithI18n(<Harness job={printJob([])} anyMade={false} />);

        expect(screen.getAllByText(/naar onze server/)[0]).toBeInTheDocument();
        expect(screen.getByText(/0 van \d+ klaar/)).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Drukkerij-set maken' }),
        ).toBeEnabled();
    });

    it('says when the files go once something is made, and offers the ZIP when all is done', () => {
        const done = printPageEdition.parts.map((part) =>
            partRow('printer', part, 'done', { downloadUrl: `/dl/${part}` }),
        );
        renderWithI18n(
            <Harness job={printJob(done, { printerZipReady: true })} anyMade />,
        );

        expect(screen.getAllByText(/7 dagen klaar/)[0]).toBeInTheDocument();
        expect(
            screen.getByRole('link', {
                name: 'Drukkerij-set downloaden (ZIP)',
            }),
        ).toHaveAttribute('href', '/zip/printer');
    });
});
