import { reportError } from '@/lib/bugsnag';
// The one door to storage: missing (server render), blocked or full storage reads as nothing stored, and never throws.
export type StorageArea = 'local' | 'session';

const blocked = <T>(error: unknown, fallback: T): T => {
    if (!(error instanceof DOMException)) {
        reportError(error);
    }

    return fallback;
};

const storageOf = (area: StorageArea): Storage | null => {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        return area === 'local' ? window.localStorage : window.sessionStorage;
    } catch (error) {
        return blocked(error, null);
    }
};

export const readStored = (
    key: string,
    area: StorageArea = 'local',
): string | null => {
    try {
        return storageOf(area)?.getItem(key) ?? null;
    } catch (error) {
        return blocked(error, null);
    }
};

export const writeStored = (
    key: string,
    value: string,
    area: StorageArea = 'local',
): boolean => {
    const storage = storageOf(area);
    if (storage === null) {
        return false;
    }
    try {
        storage.setItem(key, value);

        return true;
    } catch (error) {
        return blocked(error, false);
    }
};

export const removeStored = (
    key: string,
    area: StorageArea = 'local',
): boolean => {
    const storage = storageOf(area);
    if (storage === null) {
        return false;
    }
    try {
        storage.removeItem(key);

        return true;
    } catch (error) {
        return blocked(error, false);
    }
};

export const clearStored = (area: StorageArea = 'local'): boolean => {
    const storage = storageOf(area);
    if (storage === null) {
        return false;
    }
    try {
        storage.clear();

        return true;
    } catch (error) {
        return blocked(error, false);
    }
};
