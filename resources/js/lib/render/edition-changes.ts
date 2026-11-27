import { defaultCurrency } from '@/lib/render/game-currency';
import {
    EDITION_SCHEMA_VERSION,
    DEFAULT_PARTS,
    type Edition,
    type EditionPatch,
    type ElementChange,
    type ElementOverride,
    type NewEditionInput,
} from './edition-types';

/** NL edition: euro. EN edition: pound (B154). */

export type CreateEditionDeps = {
    id: string;
    now: number;
};

/** A new edition has no overrides: it is the standard edition (B59). */
export const createEdition = (
    input: NewEditionInput,
    deps: CreateEditionDeps,
): Edition => {
    return {
        schemaVersion: EDITION_SCHEMA_VERSION,
        id: deps.id,
        name: input.name.trim(),
        language: input.language,
        currency: input.currency ?? defaultCurrency(input.language),
        theme: input.theme,
        boardProfile: input.boardProfile,
        parts: { ...DEFAULT_PARTS, ...input.parts, board: true },
        elements: {},
        revision: 0,
        createdAt: deps.now,
        updatedAt: deps.now,
    };
};

export const isEmptyOverride = (
    override: ElementOverride | undefined,
): boolean => {
    return (
        override === undefined ||
        Object.values(override).every((value: unknown) => value === undefined)
    );
};

const clean = (
    override: ElementOverride | undefined,
): ElementOverride | undefined => {
    if (override === undefined || isEmptyOverride(override)) {
        return undefined;
    }

    return Object.fromEntries(
        Object.entries(override).filter(
            ([, value]: [string, unknown]) => value !== undefined,
        ),
    );
};

export const sameOverride = (
    a: ElementOverride | undefined,
    b: ElementOverride | undefined,
): boolean => {
    return (
        JSON.stringify(sortKeys(clean(a))) ===
        JSON.stringify(sortKeys(clean(b)))
    );
};

const sortKeys = (value: unknown): unknown => {
    if (Array.isArray(value)) {
        return value.map(sortKeys);
    }
    if (typeof value === 'object' && value !== null) {
        return Object.fromEntries(
            Object.entries(value)
                .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
                .map(([key, inner]) => [key, sortKeys(inner)]),
        );
    }

    return value;
};

/** Sets or clears one element. An override with nothing left in it is removed. */
export const setElement = (
    edition: Edition,
    key: string,
    override: ElementOverride | undefined,
): { edition: Edition; change: ElementChange | null } => {
    const before = edition.elements[key];
    const after = clean(override);
    if (sameOverride(before, after)) {
        return { edition, change: null };
    }
    const elements = { ...edition.elements };
    if (after === undefined) {
        delete elements[key];
    } else {
        elements[key] = after;
    }

    return {
        edition: { ...edition, elements },
        change: { key, before, after },
    };
};

/** Merges fields into an element; a field set to `undefined` is cleared. */
export const updateElement = (
    edition: Edition,
    key: string,
    patch: Partial<ElementOverride>,
): { edition: Edition; change: ElementChange | null } => {
    return setElement(edition, key, { ...edition.elements[key], ...patch });
};

/** Applies changes in order (forward). */
export const applyChanges = (
    edition: Edition,
    changes: readonly ElementChange[],
): Edition => {
    let next = edition;
    for (const change of changes) {
        next = setElement(next, change.key, change.after).edition;
    }

    return next;
};

/** The changes that undo `changes`, in reverse order. */
export const invertChanges = (
    changes: readonly ElementChange[],
): ElementChange[] => {
    return [...changes].reverse().map((change) => ({
        key: change.key,
        before: change.after,
        after: change.before,
    }));
};

/** Keys of elements that differ between two editions. */
export const changedElementKeys = (from: Edition, to: Edition): string[] => {
    const keys = new Set([
        ...Object.keys(from.elements),
        ...Object.keys(to.elements),
    ]);

    return [...keys]
        .filter((key) => !sameOverride(from.elements[key], to.elements[key]))
        .sort();
};

/** The patch that turns `base` into `next`, or `null` when nothing differs. Only changed elements are in it. */
export const diffEditions = (
    base: Edition,
    next: Edition,
): EditionPatch | null => {
    const patch: EditionPatch = { baseRevision: base.revision };
    let changed = false;

    if (base.name !== next.name) {
        patch.name = next.name;
        changed = true;
    }
    if (base.language !== next.language) {
        patch.language = next.language;
        changed = true;
    }
    if (base.currency !== next.currency) {
        patch.currency = next.currency;
        changed = true;
    }
    if (base.theme !== next.theme) {
        patch.theme = next.theme;
        changed = true;
    }
    if (
        JSON.stringify(sortKeys(base.boardProfile)) !==
        JSON.stringify(sortKeys(next.boardProfile))
    ) {
        patch.boardProfile = next.boardProfile;
        changed = true;
    }
    if (
        JSON.stringify(sortKeys(base.parts)) !==
        JSON.stringify(sortKeys(next.parts))
    ) {
        patch.parts = next.parts;
        changed = true;
    }
    if (base.moneyAmount !== next.moneyAmount) {
        patch.moneyAmount = next.moneyAmount ?? null;
        changed = true;
    }
    if (
        JSON.stringify(base.printSelection ?? null) !==
        JSON.stringify(next.printSelection ?? null)
    ) {
        patch.printSelection = next.printSelection ?? null;
        changed = true;
    }
    const keys = changedElementKeys(base, next);
    if (keys.length > 0) {
        patch.elements = Object.fromEntries(
            keys.map((key) => [key, next.elements[key] ?? null]),
        );
        changed = true;
    }

    return changed ? patch : null;
};

/** Applies a patch to an edition and bumps the revision. Pure; the storage calls it inside its transaction. */
export const applyEditionPatch = (
    current: Edition,
    patch: EditionPatch,
    now: number,
): Edition => {
    const elements = { ...current.elements };
    for (const [key, override] of Object.entries(patch.elements ?? {})) {
        if (override === null) {
            delete elements[key];
        } else {
            elements[key] = override;
        }
    }

    const moneyAmount =
        patch.moneyAmount === undefined
            ? current.moneyAmount
            : (patch.moneyAmount ?? undefined);
    const printSelection =
        patch.printSelection === undefined
            ? current.printSelection
            : (patch.printSelection ?? undefined);
    const { moneyAmount: _, printSelection: _selection, ...rest } = current;

    return {
        ...rest,
        ...(moneyAmount === undefined ? {} : { moneyAmount }),
        ...(printSelection === undefined ? {} : { printSelection }),
        name: patch.name ?? current.name,
        language: patch.language ?? current.language,
        currency: patch.currency ?? current.currency,
        theme: patch.theme ?? current.theme,
        boardProfile: patch.boardProfile ?? current.boardProfile,
        parts: patch.parts ?? current.parts,
        elements,
        revision: current.revision + 1,
        updatedAt: now,
    };
};
