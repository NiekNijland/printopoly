import { reportError, reportUnlessOffline, startBugsnag } from './bugsnag';

const { notify, start } = vi.hoisted(() => {
    const notify = vi.fn<(error: Error) => void>();

    return { notify, start: vi.fn(() => ({ notify })) };
});

vi.mock('@bugsnag/js', () => ({ default: { start } }));

const withConfig = (json: string): void => {
    const script = document.createElement('script');
    script.id = 'printopoly-config';
    script.type = 'application/json';
    script.textContent = json;
    document.body.append(script);
};

describe('bugsnag', () => {
    afterEach(() => {
        document.getElementById('printopoly-config')?.remove();
    });

    it('reports nothing before Bugsnag runs', () => {
        reportError(new Error('early'));

        expect(notify).not.toHaveBeenCalled();
    });

    it('does not start without a browser key', async () => {
        await startBugsnag();

        expect(start).not.toHaveBeenCalled();
    });

    it('reports an error, and any other thrown value as an error, once Bugsnag runs', async () => {
        withConfig('{"bugsnag":{"apiKey":"key","releaseStage":"production"}}');
        await startBugsnag();

        reportError(new RangeError('broken'));
        reportError('text');

        expect(start).toHaveBeenCalledOnce();
        expect(notify).toHaveBeenCalledTimes(2);
        expect(notify.mock.calls[0]?.[0]).toBeInstanceOf(RangeError);
        expect(notify.mock.calls[1]?.[0]).toEqual(new Error('text'));
    });

    it('reports a failed request only when it is not the connection', () => {
        notify.mockClear();

        reportUnlessOffline(new TypeError('Failed to fetch'));
        reportUnlessOffline(new Error('HTTP 500'));

        expect(notify).toHaveBeenCalledOnce();
    });
});
