import { readStored, writeStored } from './browser-storage';

describe('browser storage', () => {
    it('writes and reads a value in local storage', () => {
        expect(writeStored('k', 'v')).toBe(true);
        expect(readStored('k')).toBe('v');
    });

    it('keeps session storage apart from local storage', () => {
        writeStored('k', 'session', 'session');

        expect(readStored('k')).toBeNull();
        expect(readStored('k', 'session')).toBe('session');
    });

    it('reads nothing and writes nothing when the storage throws', () => {
        vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
            throw new DOMException('blocked', 'SecurityError');
        });
        vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
            throw new DOMException('full', 'QuotaExceededError');
        });

        expect(readStored('k')).toBeNull();
        expect(writeStored('k', 'v')).toBe(false);
        vi.restoreAllMocks();
    });

    it('has no storage when the window has none', () => {
        vi.stubGlobal('window', undefined);

        expect(readStored('k')).toBeNull();
        expect(writeStored('k', 'v')).toBe(false);
    });
});
