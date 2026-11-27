import { act, renderHook, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';

import { requestOf, stubFetch } from '@/testing/fetch';

import { addSent, writeFirstName, type SentRecord } from './local';
import { useOwnRecords } from './use-own-records';

const TOKEN = 't'.repeat(40);

const record = (receipt: string): SentRecord => ({
    receipt,
    elementKey: 'space.01',
    label: 'Molenweg',
    value: 'Kerkstraat',
    hasPhoto: false,
    sentAt: 1,
});

const answer = (contributions: Record<string, string>) =>
    stubFetch(
        () => new Response(JSON.stringify({ contributions }), { status: 200 }),
    );

const ServerName = () => {
    const own = useOwnRecords(TOKEN);

    return (
        <p>
            {own.firstName}:{own.sent.length}
        </p>
    );
};

describe('useOwnRecords', () => {
    it('reads the first name and what was sent through this link from the browser', async () => {
        writeFirstName('Sanne');
        addSent(TOKEN, record('r1'));
        addSent('other', record('r9'));
        const fetchMock = answer({ r1: 'applied' });

        const { result } = renderHook(() => useOwnRecords(TOKEN));

        expect(result.current.firstName).toBe('Sanne');
        expect(result.current.sent.map((item) => item.receipt)).toEqual(['r1']);
        await waitFor(() =>
            expect(result.current.states).toEqual({ r1: 'applied' }),
        );
        expect(requestOf(fetchMock).url).toBe(
            `/api/box/${TOKEN}/mine?receipts[]=r1`,
        );
    });

    it('asks the server nothing when nothing was sent', () => {
        const fetchMock = answer({});

        const { result } = renderHook(() => useOwnRecords(TOKEN));

        expect(result.current.firstName).toBe('');
        expect(result.current.sent).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('reads nothing without a token', () => {
        writeFirstName('Sanne');
        const fetchMock = answer({});

        const { result } = renderHook(() => useOwnRecords(''));

        expect(result.current.firstName).toBe('');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('renders nothing stored on the server, where there is no storage', () => {
        writeFirstName('Sanne');
        addSent(TOKEN, record('r1'));
        answer({});

        expect(renderToString(<ServerName />)).toBe('<p>:<!-- -->0</p>');
    });

    it('keeps a typed first name and a new contribution at the top, waiting', () => {
        addSent(TOKEN, record('r1'));
        answer({});
        const { result } = renderHook(() => useOwnRecords(TOKEN));

        act(() => {
            result.current.setFirstName('Daan');
            result.current.add(record('r2'));
        });

        expect(result.current.firstName).toBe('Daan');
        expect(result.current.sent.map((item) => item.receipt)).toEqual([
            'r2',
            'r1',
        ]);
        expect(result.current.states).toEqual({ r2: 'waiting' });
    });

    it('reads the records of the new link when the token changes', () => {
        addSent('a'.repeat(40), record('ra'));
        addSent('b'.repeat(40), record('rb'));
        answer({});
        const { result, rerender } = renderHook(
            ({ token }) => useOwnRecords(token),
            { initialProps: { token: 'a'.repeat(40) } },
        );

        rerender({ token: 'b'.repeat(40) });

        expect(result.current.sent.map((item) => item.receipt)).toEqual(['rb']);
    });
});
