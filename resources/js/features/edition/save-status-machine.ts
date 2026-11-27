import type { EnvironmentInfo } from './environment';
import {
    deriveSaveStatus,
    initialSaveStatusInput,
    type SaveStatus,
    type SaveStatusInput,
} from './save-status';
import type { EditionSession } from './session';

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

    failed(quotaExceeded: boolean, corrupt = false): void {
        this.update({
            phase: quotaExceeded
                ? 'failed-quota'
                : corrupt
                  ? 'failed-corrupt'
                  : 'failed-other',
        });
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
                this.failed(event.quotaExceeded, event.corrupt);
            // "Die van het andere venster" ends a conflict without a save, so "saving" must not stay on.
            else if (event.type === 'remote-update')
                this.saved(event.edition.updatedAt);
        });
    }
}
