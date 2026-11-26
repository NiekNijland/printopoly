/**
 * What this browser remembers about boxes (B128). The owner of an edition without an account holds the owner
 * secret here: it is the key to the box, and only its hash is on the server. Friends remember their first name
 * and the receipts of what they sent, so they can see what became of it. Everything is a convenience: reading
 * and writing never throw, and the pages work with an empty store.
 */

const OWNER_KEY = 'printopoly.boxes.owner';
const FRIEND_KEY = 'printopoly.boxes.friend';

export type OwnerRecord = {
    id: string;
    secret: string;
};

export type SentRecord = {
    receipt: string;
    elementKey: string;
    label: string;
    value: string;
    hasPhoto: boolean;
    sentAt: number;
};

const readObject = (key: string): Record<string, unknown> => {
    try {
        const raw = window.localStorage.getItem(key);
        const parsed: unknown = raw === null ? null : JSON.parse(raw);

        return typeof parsed === 'object' &&
            parsed !== null &&
            !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : {};
    } catch {
        return {};
    }
};

const writeObject = (key: string, value: Record<string, unknown>): void => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Private window or full storage: the page keeps working this session.
    }
};

export const readOwnerRecord = (editionId: string): OwnerRecord | null => {
    const record = readObject(OWNER_KEY)[editionId];

    if (
        typeof record === 'object' &&
        record !== null &&
        typeof (record as OwnerRecord).id === 'string' &&
        typeof (record as OwnerRecord).secret === 'string'
    ) {
        const { id, secret } = record as OwnerRecord;

        return { id, secret };
    }

    return null;
};

export const writeOwnerRecord = (
    editionId: string,
    record: OwnerRecord,
): void => {
    writeObject(OWNER_KEY, { ...readObject(OWNER_KEY), [editionId]: record });
};

export const forgetOwnerRecord = (editionId: string): void => {
    const { [editionId]: removed, ...rest } = readObject(OWNER_KEY);
    void removed;
    writeObject(OWNER_KEY, rest);
};

export const readFirstName = (): string => {
    const name = readObject(FRIEND_KEY).firstName;

    return typeof name === 'string' ? name : '';
};

export const writeFirstName = (firstName: string): void => {
    writeObject(FRIEND_KEY, { ...readObject(FRIEND_KEY), firstName });
};

/** What this friend sent through one link, newest first. */
export const readSent = (token: string): SentRecord[] => {
    const sent = readObject(FRIEND_KEY).sent;
    const list =
        typeof sent === 'object' && sent !== null
            ? (sent as Record<string, unknown>)[token]
            : undefined;

    return Array.isArray(list)
        ? list.filter(
              (item): item is SentRecord =>
                  typeof item === 'object' &&
                  item !== null &&
                  typeof (item as SentRecord).receipt === 'string',
          )
        : [];
};

export const addSent = (token: string, record: SentRecord): void => {
    const all = readObject(FRIEND_KEY);
    const sent =
        typeof all.sent === 'object' && all.sent !== null
            ? (all.sent as Record<string, unknown>)
            : {};

    writeObject(FRIEND_KEY, {
        ...all,
        sent: { ...sent, [token]: [record, ...readSent(token)].slice(0, 50) },
    });
};
