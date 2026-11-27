import {
    clearStored,
    readStored,
    removeStored,
    writeStored,
} from './browser-storage';

describe('browser storage', () => {
    it('writes, reads and removes a value in local storage', () => {
        expect(writeStored('k', 'v')).toBe(true);
        expect(readStored('k')).toBe('v');
        expect(removeStored('k')).toBe(true);
        expect(readStored('k')).toBeNull();
    });

    it('keeps session storage apart from local storage', () => {
        writeStored('k', 'session', 'session');

        expect(readStored('k')).toBeNull();
        expect(readStored('k', 'session')).toBe('session');
        expect(clearStored('session')).toBe(true);
        expect(readStored('k', 'session')).toBeNull();
    });

    it('reads nothing and writes nothing when the storage throws', () => {
        vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
            throw new DOMException('blocked', 'SecurityError');
        });
        vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
            throw new DOMException('full', 'QuotaExceededError');
        });
        vi.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
            throw new DOMException('blocked', 'SecurityError');
        });
        vi.spyOn(window.localStorage, 'clear').mockImplementation(() => {
            throw new DOMException('blocked', 'SecurityError');
        });

        expect(readStored('k')).toBeNull();
        expect(writeStored('k', 'v')).toBe(false);
        expect(removeStored('k')).toBe(false);
        expect(clearStored()).toBe(false);
        vi.restoreAllMocks();
    });

    it('has no storage when the window has none', () => {
        vi.stubGlobal('window', undefined);

        expect(readStored('k')).toBeNull();
        expect(writeStored('k', 'v')).toBe(false);
        expect(removeStored('k')).toBe(false);
        expect(clearStored()).toBe(false);
    });
});
