import { listenToDocument, listenToWindow } from './dom-events';

describe('dom events', () => {
    it('hears a window event until the returned function removes the listener', () => {
        const heard = vi.fn<(event: Event) => void>();
        const stop = listenToWindow('online', heard);

        window.dispatchEvent(new Event('online'));
        stop();
        window.dispatchEvent(new Event('online'));

        expect(heard).toHaveBeenCalledOnce();
    });

    it('removes a capturing window listener with the same options', () => {
        const heard = vi.fn<(event: PopStateEvent) => void>();
        const stop = listenToWindow('popstate', heard, { capture: true });

        stop();
        window.dispatchEvent(new PopStateEvent('popstate'));

        expect(heard).not.toHaveBeenCalled();
    });

    it('hears a document event, also of another document', () => {
        const heard = vi.fn<(event: KeyboardEvent) => void>();
        const stop = listenToDocument('keydown', heard);
        const other = document.implementation.createHTMLDocument('other');
        const otherHeard = vi.fn<(event: FocusEvent) => void>();
        const stopOther = listenToDocument(
            'focusin',
            otherHeard,
            undefined,
            other,
        );

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
        other.dispatchEvent(new FocusEvent('focusin'));
        stop();
        stopOther();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
        other.dispatchEvent(new FocusEvent('focusin'));

        expect(heard).toHaveBeenCalledOnce();
        expect(otherHeard).toHaveBeenCalledOnce();
    });
});
