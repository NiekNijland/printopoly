import type { Locale } from '@/lib/game/types';
import type { EditionBus } from './bus';
import { applyChanges, diffEditions } from './changes';
import {
    createHistory,
    record,
    redo as redoHistory,
    undo as undoHistory,
    canRedo,
    canUndo,
    type History,
} from './history';
import type { SettingsChange } from './settings';
import { isCorruptError, isQuotaError, type EditionStorage } from './storage';
import { summarizeDifference } from './summary';
import type { Edition, ElementChange } from './types';

/** One version of an edition in a conflict: when it was last changed and what changed. */
export interface ConflictSide {
    /** Milliseconds since the epoch; show as "14:32". */
    at: number;
    /** "Stadspark aangepast", "2 kaarten aangepast". */
    summary: string;
}

/** Two windows changed the same edition. The UI asks which version to keep (B81, Staten design). */
export interface EditionConflict {
    editionId: string;
    editionName: string;
    /** This window ("Dit venster"). */
    mine: ConflictSide;
    /** The other window ("Ander venster"). */
    theirs: ConflictSide;
    /** The stored version from the other window. */
    theirsEdition: Edition;
}

export type SessionEvent =
    | { type: 'change' }
    | { type: 'saving' }
    | { type: 'saved'; edition: Edition }
    | {
          type: 'save-failed';
          error: unknown;
          quotaExceeded: boolean;
          corrupt: boolean;
      }
    | { type: 'conflict'; conflict: EditionConflict }
    /** Another window saved and this window had nothing unsaved, so it took over their version. */
    | { type: 'remote-update'; edition: Edition }
    | { type: 'remote-delete' };

export interface Scheduler {
    setTimeout(callback: () => void, ms: number): unknown;
    clearTimeout(handle: unknown): void;
}

export const browserScheduler: Scheduler = {
    setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
    clearTimeout: (handle) =>
        globalThis.clearTimeout(
            handle as ReturnType<typeof globalThis.setTimeout>,
        ),
};

export const DEFAULT_DEBOUNCE_MS = 500;

export interface SessionDeps {
    storage: EditionStorage;
    bus: EditionBus;
    now: () => number;
    scheduler?: Scheduler;
    debounceMs?: number;
    /** Language of the interface, for the conflict summaries. */
    interfaceLanguage?: Locale;
    historyCap?: number;
}

/**
 * An edition open in the editor. Changes are applied at once to the working copy and saved after a short pause: only
 * the elements that changed, with a revision check, so a second window never gets overwritten silently.
 */
export class EditionSession {
    private working: Edition;
    /** The last version known to be in storage. */
    private saved: Edition;
    private history: History;
    private pendingConflict: EditionConflict | null = null;
    private timer: unknown = null;
    private queue: Promise<void> = Promise.resolve();
    private lastLocalChange: number;
    private closed = false;
    /** Deleted in another window. */
    private gone = false;
    private readonly listeners = new Set<(event: SessionEvent) => void>();
    private readonly scheduler: Scheduler;
    private readonly debounceMs: number;
    private readonly language: Locale | undefined;
    private readonly unsubscribe: () => void;

    constructor(
        edition: Edition,
        private readonly deps: SessionDeps,
    ) {
        this.working = edition;
        this.saved = edition;
        this.history = createHistory(deps.historyCap);
        this.scheduler = deps.scheduler ?? browserScheduler;
        this.debounceMs = deps.debounceMs ?? DEFAULT_DEBOUNCE_MS;
        this.language = deps.interfaceLanguage;
        this.lastLocalChange = deps.now();
        this.unsubscribe = deps.bus.subscribe((message) => {
            if (
                message.kind === 'list' ||
                message.editionId !== this.working.id
            ) {
                return;
            }
            if (message.kind === 'deleted') {
                void this.enqueue(() => {
                    this.handleRemoteDelete();

                    return Promise.resolve();
                });
            } else if (message.revision > this.saved.revision) {
                void this.enqueue(() => this.handleRemoteSave());
            }
        });
    }

    get edition(): Edition {
        return this.working;
    }

    get conflict(): EditionConflict | null {
        return this.pendingConflict;
    }

    /** True when there are changes that are not in storage yet. */
    get dirty(): boolean {
        return diffEditions(this.saved, this.working) !== null;
    }

    get canUndo(): boolean {
        return canUndo(this.history);
    }

    get canRedo(): boolean {
        return canRedo(this.history);
    }

    subscribe(listener: (event: SessionEvent) => void): () => void {
        this.listeners.add(listener);

        return () => this.listeners.delete(listener);
    }

    private emit(event: SessionEvent): void {
        for (const listener of [...this.listeners]) {
            listener(event);
        }
    }

    private enqueue(task: () => Promise<void>): Promise<void> {
        this.queue = this.queue.then(task, task);

        return this.queue;
    }

    /** Applies element changes (also used by the editor for photo moves), records them for undo and schedules a save. */
    apply(
        changes: readonly ElementChange[],
        group: string | null = null,
    ): void {
        if (changes.length === 0) {
            return;
        }
        this.history = record(this.history, changes, group);
        this.setWorking(applyChanges(this.working, changes));
    }

    /** Applies the result of a settings function (`changeTheme`, `setPart`, …). */
    applySettings(result: SettingsChange): void {
        this.history = record(this.history, result.changes);
        this.setWorking(result.edition);
    }

    /** Replaces name, language and so on without element changes, for example `rename`. */
    replace(edition: Edition): void {
        this.setWorking({ ...edition, elements: this.working.elements });
    }

    undo(): boolean {
        const step = undoHistory(this.history, this.working);
        this.history = step.history;
        if (step.changes.length === 0) {
            return false;
        }
        this.setWorking(step.edition);

        return true;
    }

    redo(): boolean {
        const step = redoHistory(this.history, this.working);
        this.history = step.history;
        if (step.changes.length === 0) {
            return false;
        }
        this.setWorking(step.edition);

        return true;
    }

    private setWorking(edition: Edition): void {
        this.working = edition;
        this.lastLocalChange = this.deps.now();
        this.emit({ type: 'change' });
        this.scheduleSave();
    }

    private scheduleSave(): void {
        if (this.closed || this.gone || this.pendingConflict !== null) {
            return;
        }
        if (this.timer !== null) {
            this.scheduler.clearTimeout(this.timer);
        }
        this.timer = this.scheduler.setTimeout(() => {
            this.timer = null;
            void this.flush();
        }, this.debounceMs);
    }

    /** Saves now. Resolves when the save is done (or failed, or blocked by a conflict). */
    flush(): Promise<void> {
        if (this.timer !== null) {
            this.scheduler.clearTimeout(this.timer);
            this.timer = null;
        }

        return this.enqueue(() => this.save());
    }

    private async save(): Promise<void> {
        if (this.gone || this.pendingConflict !== null) {
            return;
        }
        const patch = diffEditions(this.saved, this.working);
        if (patch === null) {
            return;
        }
        this.emit({ type: 'saving' });

        let result;
        try {
            result = await this.deps.storage.applyPatch(
                this.working.id,
                patch,
                this.deps.now(),
            );
        } catch (error) {
            this.emit({
                type: 'save-failed',
                error,
                quotaExceeded: isQuotaError(error),
                corrupt: isCorruptError(error),
            });
            return;
        }

        if (result.ok) {
            this.saved = result.edition;
            this.working = {
                ...this.working,
                revision: result.edition.revision,
                updatedAt: result.edition.updatedAt,
            };
            this.deps.bus.post({
                kind: 'saved',
                editionId: result.edition.id,
                revision: result.edition.revision,
            });
            this.emit({ type: 'saved', edition: result.edition });
            if (this.dirty) {
                this.scheduleSave();
            }
        } else if (result.reason === 'conflict') {
            this.raiseConflict(result.current);
        } else {
            this.handleRemoteDelete();
        }
    }

    private raiseConflict(theirs: Edition): void {
        const language = this.language ?? this.working.language;
        this.pendingConflict = {
            editionId: this.working.id,
            editionName: this.working.name,
            mine: {
                at: this.lastLocalChange,
                summary: summarizeDifference(
                    this.saved,
                    this.working,
                    language,
                ),
            },
            theirs: {
                at: theirs.updatedAt,
                summary: summarizeDifference(this.saved, theirs, language),
            },
            theirsEdition: theirs,
        };
        if (this.timer !== null) {
            this.scheduler.clearTimeout(this.timer);
            this.timer = null;
        }
        this.emit({ type: 'conflict', conflict: this.pendingConflict });
    }

    private async handleRemoteSave(): Promise<void> {
        if (this.pendingConflict !== null) {
            return;
        }
        const stored = await this.deps.storage.getEdition(this.working.id);
        if (stored === undefined || stored.revision <= this.saved.revision) {
            return;
        }
        if (this.dirty) {
            this.raiseConflict(stored);

            return;
        }
        this.takeOver(stored);
    }

    private handleRemoteDelete(): void {
        this.gone = true;
        if (this.timer !== null) {
            this.scheduler.clearTimeout(this.timer);
            this.timer = null;
        }
        this.emit({ type: 'remote-delete' });
    }

    private takeOver(edition: Edition): void {
        this.saved = edition;
        this.working = edition;
        this.history = createHistory(this.deps.historyCap);
        this.pendingConflict = null;
        this.emit({ type: 'remote-update', edition });
    }

    /** "Die van het andere venster" (`theirs`) or "Deze houden" (`mine`). */
    resolveConflict(choice: 'mine' | 'theirs'): Promise<void> {
        return this.enqueue(async () => {
            const conflict = this.pendingConflict;
            if (conflict === null) {
                return;
            }
            if (choice === 'theirs') {
                this.takeOver(conflict.theirsEdition);

                return;
            }
            // Keep mine: the other version becomes the base, so the patch contains everything that differs from it.
            this.saved = conflict.theirsEdition;
            this.working = {
                ...this.working,
                revision: conflict.theirsEdition.revision,
                updatedAt: conflict.theirsEdition.updatedAt,
            };
            this.pendingConflict = null;
            await this.save();
        });
    }

    /**
     * The person chose the version from the account over this window's own (B81): it becomes the
     * working copy and is written to the local storage as one change on top of what was saved.
     */
    adopt(theirs: Edition): Promise<void> {
        return this.enqueue(async () => {
            const target: Edition = { ...theirs, id: this.saved.id };
            const patch = diffEditions(this.saved, target);
            let adopted = this.saved;
            if (patch !== null) {
                const result = await this.deps.storage.applyPatch(
                    this.saved.id,
                    patch,
                    this.deps.now(),
                );
                if (!result.ok) {
                    return;
                }
                adopted = result.edition;
                this.deps.bus.post({
                    kind: 'saved',
                    editionId: adopted.id,
                    revision: adopted.revision,
                });
            }
            this.takeOver(adopted);
        });
    }

    /** Saves what is pending and stops listening to other windows. */
    async close(): Promise<void> {
        await this.flush();
        this.closed = true;
        this.unsubscribe();
        this.listeners.clear();
    }
}
