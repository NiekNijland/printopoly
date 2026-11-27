import { act, renderHook } from '@testing-library/react';

import type { PrintSelection } from '@/lib/render/edition-types';
import { stubFetch } from '@/testing/fetch';
import {
    fakePrintServices,
    printJob,
    printPageEdition,
} from '@/testing/print-job';
import { I18nWrapper } from '@/testing/render';

import { usePrintPage } from './use-print-page';

const ALL_PARTS: PrintSelection['parts'] = [
    'board',
    'deeds',
    'cards',
    'money',
    'pawns',
    'boxLid',
];

const props = {
    job: printJob([]),
    editionData: null,
    localEditionId: null,
    edition: printPageEdition,
};

describe('usePrintPage', () => {
    beforeEach(() => {
        window.history.replaceState(null, '', '/nl/print?set=printer');
    });

    it('ticks a part out of the set for both sets, and keeps the board in (B198)', () => {
        stubFetch(
            () =>
                new Response(JSON.stringify(props.job.status), { status: 200 }),
        );
        const { result } = renderHook(
            () =>
                usePrintPage(
                    props,
                    fakePrintServices(),
                    (chosen, _c, _j, _drawn, set) =>
                        chosen ?? { set, parts: ALL_PARTS },
                ),
            { wrapper: I18nWrapper },
        );

        expect(result.current.set).toBe('printer');
        expect(result.current.selected).toContain('money');
        act(() => {
            result.current.togglePart('money');
        });
        expect(result.current.selected).not.toContain('money');
        expect(result.current.selected).toContain('board');
    });

    it('switches the set and takes the selection along (B199)', () => {
        const { result } = renderHook(
            () =>
                usePrintPage(
                    props,
                    fakePrintServices(),
                    (chosen, _c, _j, _drawn, set) =>
                        chosen ?? { set, parts: ALL_PARTS },
                ),
            { wrapper: I18nWrapper },
        );

        act(() => {
            result.current.switchSet('home');
        });
        expect(result.current.set).toBe('home');
        expect(result.current.selection.set).toBe('home');
        expect(result.current.choice).toEqual(props.job.choices.home);
    });
});
