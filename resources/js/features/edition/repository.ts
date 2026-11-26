import type { FeatureEvent } from '@/lib/feature-count';
import { EDITOR_TABS, tabKeys } from '@/lib/render/editor-catalogue';
import { validateProfile } from '@/lib/render/print-board';
import type { Locale } from '@/types/game';
import {
    baselineOf,
    differsFromBaseline,
} from '../../lib/render/edition-baseline';
import { createEdition } from '../../lib/render/edition-changes';
import { parseKey } from '../../lib/render/edition-keys';
import {
    isQuotaError,
    type EditionStorage,
} from '../../lib/render/edition-storage';
import type {
    Edition,
    EditionSummary,
    ElementOverride,
    Elements,
    FreeLayer,
    NewEditionInput,
    PhotoPlacement,
    PhotoRecord,
    PrintSelection,
} from '../../lib/render/edition-types';
import type { EditionBus } from './bus';
import { EditionSession, type Scheduler } from './session';

export const DAY_MS = 24 * 60 * 60 * 1000;

export type RepositoryDeps = {
    storage: EditionStorage;
    bus: EditionBus;
    now: () => number;
    /** Returns a new unique id, for example `crypto.randomUUID`. */
    newId: () => string;
    scheduler?: Scheduler;
    debounceMs?: number;
    interfaceLanguage?: Locale;
    /** The anonymous feature counter (B206); left out in tests. */
    count?: (event: FeatureEvent) => void;
};

export type PhotoInput = {
    blob: Blob;
    preview?: Blob;
    width: number;
    height: number;
    fileName?: string;
};

/** Ids of all photos an edition refers to, including free layers. */
export const usedPhotoIds = (elements: Elements): Set<string> => {
    const ids = new Set<string>();
    for (const override of Object.values(elements)) {
        if (override.photo !== undefined) {
            ids.add(override.photo.photoId);
        }
        if (override.background !== undefined) {
            ids.add(override.background.photoId);
        }
        if (override.icon !== undefined && 'photo' in override.icon) {
            ids.add(override.icon.photo.photoId);
        }
        for (const layer of override.layers ?? []) {
            if (layer.kind === 'photo') {
                ids.add(layer.photo.photoId);
            }
        }
    }

    return ids;
};

const mapPlacement = (
    photo: PhotoPlacement,
    ids: ReadonlyMap<string, string>,
): PhotoPlacement => {
    return { ...photo, photoId: ids.get(photo.photoId) ?? photo.photoId };
};

const mapPhotoIds = (
    elements: Elements,
    ids: ReadonlyMap<string, string>,
): Elements => {
    const out: Elements = {};
    for (const [key, override] of Object.entries(elements)) {
        const next: ElementOverride = { ...override };
        if (override.photo !== undefined) {
            next.photo = mapPlacement(override.photo, ids);
        }
        if (override.background !== undefined) {
            next.background = mapPlacement(override.background, ids);
        }
        if (override.icon !== undefined && 'photo' in override.icon) {
            next.icon = {
                ...override.icon,
                photo: mapPlacement(override.icon.photo, ids),
            };
        }
        if (override.layers !== undefined) {
            next.layers = override.layers.map((layer): FreeLayer =>
                layer.kind === 'photo'
                    ? { ...layer, photo: mapPlacement(layer.photo, ids) }
                    : layer,
            );
        }
        out[key] = next;
    }

    return out;
};

/**
 * What "Mijn edities" says about an edition. "Aangepast" counts against the template the edition started from
 * (B152, bug 25 ronde 3), like the editor does: a fresh template edition has changed nothing yet.
 */
const summarize = (edition: Edition): EditionSummary => {
    const keys = [
        ...new Set([
            ...Object.keys(edition.elements),
            ...Object.keys(baselineOf(edition).elements),
        ]),
    ].filter((key) => differsFromBaseline(edition, key));
    // Everything the editor lists, plus anything changed that it does not list: the share that is your own.
    const all = new Set([
        ...EDITOR_TABS.flatMap((tab) => tabKeys(tab, edition.elements)),
        ...keys,
    ]);
    const share = keys.length === 0 ? 0 : (keys.length / all.size) * 100;

    return {
        id: edition.id,
        name: edition.name,
        language: edition.language,
        theme: edition.theme,
        revision: edition.revision,
        updatedAt: edition.updatedAt,
        createdAt: edition.createdAt,
        customizedSpaces: keys.filter((key) => parseKey(key)?.kind === 'space')
            .length,
        customizedElements: keys.length,
        // Never 0 % with a change made, never 100 % unless everything is.
        customizedPercent:
            share === 0
                ? 0
                : Math.min(
                      keys.length === all.size ? 100 : 99,
                      Math.max(1, Math.round(share)),
                  ),
    };
};

const copySuffix: Record<Locale, string> = { nl: 'kopie', en: 'copy' };

/**
 * "Club" becomes "Club (kopie)", a copy of that becomes "Club (kopie 2)", and so on: the
 * suffix is counted, never stacked, and skips names that already exist (bug 36, ronde 4).
 */
const copyName = (
    name: string,
    language: Locale,
    existing: readonly string[],
): string => {
    const word = copySuffix[language];
    const base =
        name.replace(/\s*\((?:kopie|copy)(?:\s+\d+)?\)$/u, '').trimEnd() ||
        name;
    const taken = new Set(existing.map((other) => other.trim()));
    let candidate = `${base} (${word})`;
    for (let n = 2; taken.has(candidate); n++) {
        candidate = `${base} (${word} ${n})`;
    }

    return candidate;
};

export class EditionRepository {
    constructor(private readonly deps: RepositoryDeps) {}

    /** "Mijn edities": newest first (B79). */
    async list(): Promise<EditionSummary[]> {
        const editions = await this.deps.storage.listEditions();

        return editions
            .map(summarize)
            .sort(
                (a, b) =>
                    b.updatedAt - a.updatedAt || a.name.localeCompare(b.name),
            );
    }

    get(id: string): Promise<Edition | undefined> {
        return this.deps.storage.getEdition(id);
    }

    /** New edition from the fields of the new-edition screen (B72). Throws when the board profile does not work. */
    async create(
        input: NewEditionInput,
        /** Changes the new edition before it is stored, such as the empty names and cards of Leeg (B259). */
        prepare: (edition: Edition) => Edition = (edition) => edition,
    ): Promise<Edition> {
        const name = input.name.trim();
        if (name === '') {
            throw new RangeError('An edition needs a name');
        }
        const problems = validateProfile(input.boardProfile);
        if (problems.length > 0) {
            throw new RangeError(problems.join(' '));
        }
        const edition = prepare(
            createEdition(
                { ...input, name },
                { id: this.deps.newId(), now: this.deps.now() },
            ),
        );
        await this.deps.storage.createEdition(edition);
        this.deps.bus.post({ kind: 'list' });
        this.deps.count?.('edition_created');

        return edition;
    }

    /**
     * A new edition that starts as a copy of `template`, such as the sample edition (B97): fresh id and
     * revision 0. The template may carry no photos; photo ids are not copied.
     */
    async createFrom(template: Edition): Promise<Edition> {
        const problems = validateProfile(template.boardProfile);
        if (problems.length > 0) {
            throw new RangeError(problems.join(' '));
        }
        const now = this.deps.now();
        const edition: Edition = {
            ...template,
            id: this.deps.newId(),
            elements: structuredClone(template.elements),
            revision: 0,
            createdAt: now,
            updatedAt: now,
        };
        await this.deps.storage.createEdition(edition);
        this.deps.bus.post({ kind: 'list' });
        this.deps.count?.('edition_created');
        if (template.template !== undefined) {
            this.deps.count?.('template_chosen');
        }

        return edition;
    }

    /** Opens an edition for editing, with autosave. Returns `undefined` when it does not exist. */
    async open(id: string): Promise<EditionSession | undefined> {
        const edition = await this.deps.storage.getEdition(id);
        if (edition === undefined) {
            return undefined;
        }
        try {
            await this.pruneUnusedPhotos(id);
        } catch (error) {
            if (!isQuotaError(error)) {
                throw error;
            }
        }

        return new EditionSession(edition, {
            storage: this.deps.storage,
            bus: this.deps.bus,
            now: this.deps.now,
            ...(this.deps.scheduler === undefined
                ? {}
                : { scheduler: this.deps.scheduler }),
            ...(this.deps.debounceMs === undefined
                ? {}
                : { debounceMs: this.deps.debounceMs }),
            ...(this.deps.interfaceLanguage === undefined
                ? {}
                : { interfaceLanguage: this.deps.interfaceLanguage }),
        });
    }

    /** Renames without opening the editor. Retries once when another window saved in between. */
    async rename(id: string, name: string): Promise<Edition> {
        const trimmed = name.trim();
        if (trimmed === '') {
            throw new RangeError('An edition needs a name');
        }
        for (let attempt = 0; attempt < 2; attempt++) {
            const current = await this.deps.storage.getEdition(id);
            if (current === undefined) {
                throw new Error(`Edition ${id} does not exist`);
            }
            const result = await this.deps.storage.applyPatch(
                id,
                { baseRevision: current.revision, name: trimmed },
                this.deps.now(),
            );
            if (result.ok) {
                this.deps.bus.post({
                    kind: 'saved',
                    editionId: id,
                    revision: result.edition.revision,
                });
                this.deps.bus.post({ kind: 'list' });

                return result.edition;
            }
            if (result.reason === 'missing') {
                break;
            }
        }
        throw new Error(`Edition ${id} could not be renamed`);
    }

    /**
     * Keeps what goes in the print set on the edition (B198), as the print page chose it. Retries once when another
     * window saved in between, like `rename`. Returns the saved edition, or undefined when it is gone.
     */
    async setPrintSelection(
        id: string,
        selection: PrintSelection,
    ): Promise<Edition | undefined> {
        for (let attempt = 0; attempt < 2; attempt++) {
            const current = await this.deps.storage.getEdition(id);
            if (current === undefined) {
                return undefined;
            }
            if (
                JSON.stringify(current.printSelection ?? null) ===
                JSON.stringify(selection)
            ) {
                return current;
            }
            const result = await this.deps.storage.applyPatch(
                id,
                { baseRevision: current.revision, printSelection: selection },
                this.deps.now(),
            );
            if (result.ok) {
                this.deps.bus.post({
                    kind: 'saved',
                    editionId: id,
                    revision: result.edition.revision,
                });

                return result.edition;
            }
            if (result.reason === 'missing') {
                return undefined;
            }
        }
        throw new Error(`Edition ${id} could not keep its print selection`);
    }

    /** A copy with its own id, revision 0 and its own copies of the photos (B96). */
    async duplicate(id: string, name?: string): Promise<Edition> {
        const source = await this.deps.storage.getEdition(id);
        if (source === undefined) {
            throw new Error(`Edition ${id} does not exist`);
        }
        const now = this.deps.now();
        const photos = await this.deps.storage.listPhotos(id);
        const newId = this.deps.newId();
        const idMap = new Map(
            photos.map((photo) => [photo.id, this.deps.newId()] as const),
        );
        const copy: Edition = {
            ...source,
            id: newId,
            name:
                name?.trim() ||
                copyName(
                    source.name,
                    source.language,
                    (await this.deps.storage.listEditions()).map(
                        (edition) => edition.name,
                    ),
                ),
            elements: mapPhotoIds(source.elements, idMap),
            revision: 0,
            createdAt: now,
            updatedAt: now,
        };
        // Photos first: a half-made copy then never points at photos that are missing.
        for (const photo of photos) {
            await this.deps.storage.putPhoto({
                ...photo,
                id: idMap.get(photo.id) ?? photo.id,
                editionId: newId,
                createdAt: now,
            });
        }
        await this.deps.storage.createEdition(copy);
        this.deps.bus.post({ kind: 'list' });

        return copy;
    }

    /** Removes the edition and all its photos (B79, B96). It cannot be undone. */
    async delete(id: string): Promise<void> {
        await this.deps.storage.deleteEdition(id);
        this.deps.bus.post({ kind: 'deleted', editionId: id });
        this.deps.bus.post({ kind: 'list' });
    }

    /** Stores a photo for an edition and returns its id. The editor puts it in an element with `PhotoPlacement`. */
    async addPhoto(editionId: string, photo: PhotoInput): Promise<string> {
        const id = this.deps.newId();
        const record: PhotoRecord = {
            id,
            editionId,
            blob: photo.blob,
            width: photo.width,
            height: photo.height,
            createdAt: this.deps.now(),
            ...(photo.preview === undefined ? {} : { preview: photo.preview }),
            ...(photo.fileName === undefined
                ? {}
                : { fileName: photo.fileName }),
        };
        await this.deps.storage.putPhoto(record);
        this.deps.count?.('photo_added');

        return id;
    }

    getPhoto(id: string): Promise<PhotoRecord | undefined> {
        return this.deps.storage.getPhoto(id);
    }

    /**
     * Deletes photos no element uses any more. Photos younger than `minAgeMs` stay: another window may have added one
     * that is not saved yet, and an undo can bring a reference back while the editor is open.
     */
    async pruneUnusedPhotos(
        editionId: string,
        minAgeMs: number = DAY_MS,
    ): Promise<string[]> {
        const edition = await this.deps.storage.getEdition(editionId);
        if (edition === undefined) {
            return [];
        }
        const used = usedPhotoIds(edition.elements);
        const cutoff = this.deps.now() - minAgeMs;
        const stale = (await this.deps.storage.listPhotos(editionId))
            .filter((photo) => !used.has(photo.id) && photo.createdAt <= cutoff)
            .map((photo) => photo.id);
        if (stale.length > 0) {
            await this.deps.storage.deletePhotos(stale);
        }

        return stale;
    }
}
