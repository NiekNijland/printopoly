// The one door to storage: missing (server render), blocked or full storage reads as nothing stored, and never throws.
export type StorageArea = 'local' | 'session';

const storageOf = (area: StorageArea): Storage | null => {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        return area === 'local' ? window.localStorage : window.sessionStorage;
    } catch {
        return null;
    }
};

export const readStored = (
    key: string,
    area: StorageArea = 'local',
): string | null => {
    try {
        return storageOf(area)?.getItem(key) ?? null;
    } catch {
        return null;
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
    } catch {
        return false;
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
    } catch {
        return false;
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
    } catch {
        return false;
    }
};
