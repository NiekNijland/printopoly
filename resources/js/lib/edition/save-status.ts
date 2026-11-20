import type { Locale } from '@/lib/game/types';
import type { EnvironmentInfo } from './environment';
import type { EditionSession } from './session';
import { messages } from './strings';

/** The states of the save status in the editor (Staten design, B92). */
export type SaveStatusKind =
    | 'saving'
    | 'saved-local'
    | 'saved-account'
    | 'offline'
    | 'private-window'
    | 'safari-eviction'
    | 'storage-nearly-full'
    | 'storage-full'
    | 'save-failed';

export interface SaveStatus {
    kind: SaveStatusKind;
    /** Time of the last save, when there is one. */
    at?: number;
    /** Shown on a warning background (Staten design). */
    warning: boolean;
}

export type SavePhase = 'idle' | 'saving' | 'failed-quota' | 'failed-other';

export interface SaveStatusInput {
    phase: SavePhase;
    lastSavedAt: number | null;
    online: boolean;
    account: {
        loggedIn: boolean;
        /** Local changes that are not on the server yet. */
        pendingSync: boolean;
        syncedAt: number | null;
    };
    environment: Pick<
        EnvironmentInfo,
        'privateWindow' | 'safariEvictionRisk'
    > & {
        storageLevel: 'ok' | 'nearly-full' | 'full';
    };
}

export const initialSaveStatusInput: SaveStatusInput = {
    phase: 'idle',
    lastSavedAt: null,
    online: true,
    account: { loggedIn: false, pendingSync: false, syncedAt: null },
    environment: {
        privateWindow: false,
        safariEvictionRisk: false,
        storageLevel: 'ok',
    },
};

/** Which status to show. Problems that lose work come first; then what is happening; then where the edition is saved. */
export function deriveSaveStatus(input: SaveStatusInput): SaveStatus {
    const { phase, lastSavedAt, online, account, environment } = input;
    const at = lastSavedAt === null ? {} : { at: lastSavedAt };

    if (phase === 'failed-quota')
        return { kind: 'storage-full', warning: true };
    if (phase === 'failed-other') return { kind: 'save-failed', warning: true };
    if (environment.privateWindow)
        return { kind: 'private-window', ...at, warning: true };
    if (phase === 'saving') return { kind: 'saving', warning: false };

    if (account.loggedIn) {
        if (!online) return { kind: 'offline', ...at, warning: false };
        if (account.pendingSync) return { kind: 'saving', warning: false };

        return {
            kind: 'saved-account',
            ...(account.syncedAt === null ? at : { at: account.syncedAt }),
            warning: false,
        };
    }
    if (environment.storageLevel !== 'ok')
        return { kind: 'storage-nearly-full', ...at, warning: false };
    if (environment.safariEvictionRisk)
        return { kind: 'safari-eviction', ...at, warning: false };

    return { kind: 'saved-local', ...at, warning: false };
}

export type TimeFormatter = (at: number, locale: Locale) => string;

/** "14:32" */
export const formatClock: TimeFormatter = (at, locale) =>
    new Intl.DateTimeFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(at);

export interface SaveStatusText {
    /** The sentence without the login prompt. */
    message: string;
    /** "Inloggen met Google" when the status invites to log in; the UI makes it a link. */
    actionLabel: string | null;
    /** `message` and `actionLabel` as one line, as in the design. */
    text: string;
}

/** Wording from the Staten design. */
export function describeSaveStatus(
    status: SaveStatus,
    locale: Locale,
    format: TimeFormatter = formatClock,
): SaveStatusText {
    const m = messages[locale];
    const time = status.at === undefined ? null : format(status.at, locale);
    const action = m.loginAction;
    const line = (parts: (string | null)[]) =>
        parts.filter((part): part is string => part !== null).join(' · ');
    const result = (
        message: string,
        actionLabel: string | null,
        joined: string,
    ): SaveStatusText => ({
        message,
        actionLabel,
        text: joined,
    });

    switch (status.kind) {
        case 'saving':
            return result(m.save.saving, null, m.save.saving);
        case 'saved-local': {
            const message = line([m.save.savedLocal, time]);

            return result(message, action, line([message, action]));
        }
        case 'saved-account': {
            const message = line([m.save.savedAccount, time]);

            return result(message, null, message);
        }
        case 'offline':
            return result(m.save.offline, null, m.save.offline);
        case 'private-window':
            return result(
                m.save.privateWindow,
                action,
                `${m.save.privateWindow} ${action}`,
            );
        case 'safari-eviction':
            return result(
                m.save.safariEviction,
                action,
                `${m.save.safariEviction} ${action}`,
            );
        case 'storage-nearly-full':
            return result(
                m.save.storageNearlyFull,
                action,
                `${m.save.storageNearlyFull} ${action}`,
            );
        case 'storage-full':
            return result(
                m.save.storageFull,
                action,
                `${m.save.storageFull} ${action}`,
            );
        case 'save-failed':
            return result(
                m.save.saveFailed,
                action,
                `${m.save.saveFailed} ${action}`,
            );
    }
}

/** Holds the inputs and tells listeners when the shown status changes. */
export class SaveStatusMachine {
    private input: SaveStatusInput;
    private status: SaveStatus;
    private readonly listeners = new Set<(status: SaveStatus) => void>();

    constructor(initial: Partial<SaveStatusInput> = {}) {
        this.input = { ...initialSaveStatusInput, ...initial };
        this.status = deriveSaveStatus(this.input);
    }

    get current(): SaveStatus {
        return this.status;
    }

    subscribe(listener: (status: SaveStatus) => void): () => void {
        this.listeners.add(listener);

        return () => this.listeners.delete(listener);
    }

    private update(change: Partial<SaveStatusInput>): void {
        this.input = { ...this.input, ...change };
        const next = deriveSaveStatus(this.input);
        const changed = JSON.stringify(next) !== JSON.stringify(this.status);
        this.status = next;
        if (changed) {
            for (const listener of [...this.listeners]) {
                listener(next);
            }
        }
    }

    saving(): void {
        this.update({ phase: 'saving' });
    }

    saved(at: number): void {
        this.update({ phase: 'idle', lastSavedAt: at });
    }

    failed(quotaExceeded: boolean): void {
        this.update({ phase: quotaExceeded ? 'failed-quota' : 'failed-other' });
    }

    setOnline(online: boolean): void {
        this.update({ online });
    }

    /** Called after login, logout and each sync with the server (B81). */
    setAccount(account: Partial<SaveStatusInput['account']>): void {
        this.update({ account: { ...this.input.account, ...account } });
    }

    setEnvironment(
        info: Pick<
            EnvironmentInfo,
            'privateWindow' | 'safariEvictionRisk' | 'storage'
        >,
    ): void {
        this.update({
            environment: {
                privateWindow: info.privateWindow,
                safariEvictionRisk: info.safariEvictionRisk,
                storageLevel: info.storage?.level ?? 'ok',
            },
        });
    }

    /** Follows the autosave of an open edition. Returns a function that stops following. */
    bind(session: EditionSession): () => void {
        return session.subscribe((event) => {
            if (event.type === 'saving') this.saving();
            else if (event.type === 'saved')
                this.saved(event.edition.updatedAt);
            else if (event.type === 'save-failed')
                this.failed(event.quotaExceeded);
        });
    }
}
