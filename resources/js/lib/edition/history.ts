import { applyChanges, invertChanges } from './changes';
import type { Edition, ElementChange } from './types';

/** Undo/redo as a stack of element-level changes (B60). Immutable: every function returns a new history. */
export const DEFAULT_HISTORY_CAP = 100;

export interface HistoryEntry {
    changes: ElementChange[];
    /** Entries with the same non-null group id merge, so typing a name is one undo step. */
    group: string | null;
}

export interface History {
    past: HistoryEntry[];
    future: HistoryEntry[];
    cap: number;
}

export function createHistory(cap = DEFAULT_HISTORY_CAP): History {
    return { past: [], future: [], cap };
}

export const canUndo = (history: History) => history.past.length > 0;
export const canRedo = (history: History) => history.future.length > 0;

/** Records changes. A new change clears the redo stack. Empty change lists are ignored. */
export function record(history: History, changes: readonly ElementChange[], group: string | null = null): History {
    if (changes.length === 0) {
        return history;
    }
    const last = history.past[history.past.length - 1];
    let past: HistoryEntry[];

    if (group !== null && last !== undefined && last.group === group) {
        past = [...history.past.slice(0, -1), { group, changes: mergeChanges(last.changes, changes) }];
    } else {
        past = [...history.past, { group, changes: [...changes] }];
    }
    if (past.length > history.cap) {
        past = past.slice(past.length - history.cap);
    }

    return { ...history, past, future: [] };
}

/** Keeps the oldest `before` and the newest `after` of each key. */
function mergeChanges(older: readonly ElementChange[], newer: readonly ElementChange[]): ElementChange[] {
    const merged = new Map<string, ElementChange>();
    for (const change of [...older, ...newer]) {
        const existing = merged.get(change.key);
        merged.set(
            change.key,
            existing === undefined ? change : { key: change.key, before: existing.before, after: change.after },
        );
    }

    return [...merged.values()];
}

export interface HistoryStep {
    history: History;
    edition: Edition;
    /** What was applied; empty when there was nothing to undo or redo. */
    changes: ElementChange[];
}

export function undo(history: History, edition: Edition): HistoryStep {
    const entry = history.past[history.past.length - 1];
    if (entry === undefined) {
        return { history, edition, changes: [] };
    }
    const changes = invertChanges(entry.changes);

    return {
        history: { ...history, past: history.past.slice(0, -1), future: [...history.future, entry] },
        edition: applyChanges(edition, changes),
        changes,
    };
}

export function redo(history: History, edition: Edition): HistoryStep {
    const entry = history.future[history.future.length - 1];
    if (entry === undefined) {
        return { history, edition, changes: [] };
    }

    return {
        history: { ...history, past: [...history.past, entry], future: history.future.slice(0, -1) },
        edition: applyChanges(edition, entry.changes),
        changes: [...entry.changes],
    };
}
