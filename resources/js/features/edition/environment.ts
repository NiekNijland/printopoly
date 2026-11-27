/** Browser storage facts behind injectable dependencies, so they can be tested without a browser. */
export type StorageManagerLike = {
    estimate?(): Promise<{ usage?: number; quota?: number }>;
    persist?(): Promise<boolean>;
    persisted?(): Promise<boolean>;
};

export type EnvironmentDeps = {
    userAgent: string;
    storage?: StorageManagerLike;
    /** Tries to open an IndexedDB database; false when the browser refuses (some private modes). */
    canOpenIndexedDB(): Promise<boolean>;
};

/** From 80% used we warn (B82). */
const NEARLY_FULL_RATIO = 0.8;
const FULL_RATIO = 0.98;
/** Chromium limits a private window to roughly 100 MB; a smaller quota than this suggests one. */
const PRIVATE_QUOTA_BYTES = 120 * 1024 * 1024;

export type StorageLevel = 'ok' | 'nearly-full' | 'full';

export type StorageUsage = {
    usage: number;
    quota: number;
    ratio: number;
    level: StorageLevel;
};

export type EnvironmentInfo = {
    /** Heuristic: true when the browser looks like a private window. */
    privateWindow: boolean;
    /** Safari deletes site data after 7 days without a visit, unless the site is persisted. */
    safariEvictionRisk: boolean;
    persisted: boolean;
    storage: StorageUsage | null;
};

export type PersistResult = 'already' | 'granted' | 'denied' | 'unsupported';

/** Safari on macOS and iOS, not other browsers that say "Safari" in their user agent. */
export const isSafari = (userAgent: string): boolean => {
    return (
        /Safari\//.test(userAgent) &&
        /Version\//.test(userAgent) &&
        !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg\/|OPR\/|OPiOS|Android/.test(
            userAgent,
        )
    );
};

export const isChromium = (userAgent: string): boolean => {
    return (
        /Chrome\/|Chromium\/|CriOS\//.test(userAgent) &&
        !/Firefox|FxiOS/.test(userAgent)
    );
};

export const storageLevel = (ratio: number): StorageLevel => {
    if (ratio >= FULL_RATIO) return 'full';
    if (ratio >= NEARLY_FULL_RATIO) return 'nearly-full';

    return 'ok';
};

/** `null` when the browser cannot tell. */
export const readStorageUsage = async (
    storage: StorageManagerLike | undefined,
): Promise<StorageUsage | null> => {
    if (storage?.estimate === undefined) {
        return null;
    }
    try {
        const { usage, quota } = await storage.estimate();
        if (usage === undefined || quota === undefined || quota <= 0) {
            return null;
        }
        const ratio = usage / quota;

        return { usage, quota, ratio, level: storageLevel(ratio) };
    } catch {
        return null;
    }
};

/** Asks the browser not to delete our data (B92). Skipped when it is already granted. */
export const requestPersistence = async (
    storage: StorageManagerLike | undefined,
): Promise<PersistResult> => {
    if (storage?.persist === undefined) {
        return 'unsupported';
    }
    try {
        if ((await storage.persisted?.()) === true) {
            return 'already';
        }

        return (await storage.persist()) ? 'granted' : 'denied';
    } catch {
        return 'unsupported';
    }
};

/**
 * A guess, since no browser tells. Two signs: IndexedDB cannot be opened, or a Chromium browser reports a small quota.
 * A wrong guess only shows a warning that is too cautious.
 */
export const detectPrivateWindow = async (
    deps: EnvironmentDeps,
    usage?: StorageUsage | null,
): Promise<boolean> => {
    if (!(await deps.canOpenIndexedDB())) {
        return true;
    }
    const resolved =
        usage === undefined ? await readStorageUsage(deps.storage) : usage;

    return (
        isChromium(deps.userAgent) &&
        resolved !== null &&
        resolved.quota < PRIVATE_QUOTA_BYTES
    );
};

export const detectEnvironment = async (
    deps: EnvironmentDeps,
): Promise<EnvironmentInfo> => {
    const storage = await readStorageUsage(deps.storage);
    let persisted = false;
    try {
        persisted = (await deps.storage?.persisted?.()) === true;
    } catch {
        persisted = false;
    }

    return {
        privateWindow: await detectPrivateWindow(deps, storage),
        safariEvictionRisk: isSafari(deps.userAgent) && !persisted,
        persisted,
        storage,
    };
};

/** Real browser dependencies. Call only in the browser. */
export const browserEnvironmentDeps = (): EnvironmentDeps => {
    return {
        userAgent: navigator.userAgent,
        storage: navigator.storage,
        canOpenIndexedDB: () =>
            new Promise((resolve) => {
                if (typeof indexedDB === 'undefined') {
                    resolve(false);

                    return;
                }
                try {
                    const request = indexedDB.open('printopoly-probe');
                    request.onsuccess = () => {
                        request.result.close();
                        indexedDB.deleteDatabase('printopoly-probe');
                        resolve(true);
                    };
                    request.onerror = () => resolve(false);
                } catch {
                    resolve(false);
                }
            }),
    };
};
