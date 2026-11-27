import { editElement } from '@/features/edition/editor/edit';
import type { EditionSession } from '@/features/edition/session';
import { setElement } from '@/lib/render/edition-changes';
import {
    BOARD_CENTER_KEY,
    BOX_LID_KEY,
    INVITATION_KEY,
    parseKey,
} from '@/lib/render/edition-keys';
import type {
    ElementOverride,
    PhotoPlacement,
    PhotoRecord,
} from '@/lib/render/edition-types';
import { holdsPhoto } from '@/lib/render/editor-catalogue';
import { photoKindOf } from '@/lib/render/editor-photo-batch';
import {
    nameCandidates,
    planPhotoChoice,
} from '@/lib/render/editor-photo-match';
import {
    lidLogoPlacement,
    startingPlacement,
} from '@/lib/render/editor-placements';

/** One photo of a choice of several, and the element it went on (ronde 3, UX 1). */
export type PlacedPhoto = {
    key: string;
    label: string;
    file: string;
    /** The placement it got, so the list can move it to another element (UX 4, ronde 4). */
    placement: PhotoPlacement;
    /** By its file name (B237), on the next empty element, or chosen in the list afterwards. */
    how: 'name' | 'order' | 'chosen';
    /** The element had a photo before this one. */
    replaced: boolean;
};

/** A photo of the choice that found no element: the list asks where it goes (B237). */
type MissedPhoto = {
    file: File;
    name: string;
    /** A preview of the file itself, so the row shows which photo it is; empty when the browser cannot make one. */
    url: string;
};

/**
 * What the panel says after photos went somewhere. A choice of several photos stays as a list "photo → element" with
 * one Ongedaan maken, until the next choice; a paste problem is a plain message.
 */
export type Placed =
    | { kind: 'message'; text: string }
    | {
          kind: 'batch';
          items: PlacedPhoto[];
          /** Photos that found no element, by name or in order (B237). */
          missed: MissedPhoto[];
          /** Elements skipped and photos left over, in words; empty when there is nothing to say. */
          note: string;
          undone: boolean;
          /** Every element a photo of this choice may go to, with its name, for the choice per row (UX 4). */
          pool: { key: string; label: string }[];
      };
export type Before = Map<string, ElementOverride | undefined>;

/** Puts a new photo on `key`, remembering how the element was for Ongedaan maken. */
const placePhoto = (
    session: EditionSession,
    before: Before,
    key: string,
    record: PhotoRecord,
    group: string | null,
): PhotoPlacement => {
    const now = session.edition.elements[key];
    // A photo replaces an icon of a special space (B136): the space shows one picture.
    const icon = now?.icon;
    // A logo in the board centre starts whole and centred (Passend, B168): nothing of it is cut off.
    const logo = key === BOARD_CENTER_KEY && now?.centerMode === 'logo';
    if (group !== null && !before.has(key)) {
        before.set(key, now);
    }
    // The strip of the invitation is wide and low: every photo there starts whole (Passend), so a standing
    // drawing keeps its head (UX 4, Mila in ronde 4).
    const placement: PhotoPlacement =
        logo || key === INVITATION_KEY
            ? {
                  ...startingPlacement(record.id, record),
                  cx: 0.5,
                  cy: 0.5,
                  fit: true,
              }
            : startingPlacement(record.id, record);
    // A box lid that shows the logo of the board (B241) shows the new logo too, in the same undo step.
    const lid = session.edition.elements[BOX_LID_KEY];
    const lidFollows =
        logo &&
        now.photo !== undefined &&
        lid?.photo?.photoId === now.photo.photoId;
    const step = group ?? (lidFollows ? `logo:${String(Date.now())}` : null);
    editElement(
        session,
        key,
        {
            ...(key === BOARD_CENTER_KEY && record.height > 0
                ? { photoAspect: record.width / record.height }
                : {}),
            ...(icon === undefined ? {} : { icon: undefined }),
            // One photo per centre (B187): it takes the place of a photo over the whole centre.
            ...(key === BOARD_CENTER_KEY ? { background: undefined } : {}),
            photo: placement,
        },
        step,
    );
    if (lidFollows) {
        if (group !== null && !before.has(BOX_LID_KEY)) {
            before.set(BOX_LID_KEY, lid);
        }
        editElement(
            session,
            BOX_LID_KEY,
            { photo: lidLogoPlacement(placement) },
            step,
        );
    }

    return placement;
};

/**
 * Where a photo of this choice may go in the list "foto → vak" (UX 4): every space and pawn a name can find
 * (B237), or for cards and notes the open element and the empty ones of its kind after it.
 */
const photoPool = (
    session: EditionSession,
    editKey: string | null,
    siblings: readonly string[],
    labelOf: (key: string) => string,
): { key: string; label: string }[] => {
    const kind = editKey === null ? undefined : parseKey(editKey)?.kind;
    if (editKey === null || kind === 'space' || kind === 'pawn') {
        const candidates = nameCandidates(session.edition, labelOf);

        return editKey === null ||
            candidates.some((candidate) => candidate.key === editKey)
            ? candidates
            : [{ key: editKey, label: labelOf(editKey) }, ...candidates];
    }
    const same = photoKindOf(editKey);

    return [
        editKey,
        ...siblings.filter(
            (key) =>
                same !== null &&
                photoKindOf(key) === same &&
                holdsPhoto(key) &&
                session.edition.elements[key]?.photo === undefined,
        ),
    ].map((key) => ({ key, label: labelOf(key) }));
};

export const undoChanges = (session: EditionSession, before: Before): void => {
    const changes = [...before.entries()].flatMap(([key, override]) => {
        const { change } = setElement(session.edition, key, override);

        return change === null ? [] : [change];
    });
    session.apply(changes);
};

type Batch = Extract<Placed, { kind: 'batch' }>;

export const movePhoto = (
    session: EditionSession,
    before: Before,
    placed: Batch,
    index: number,
    key: string,
    labelOf: (key: string) => string,
): PlacedPhoto[] | null => {
    const item = placed.items[index];
    if (item === undefined || item.key === key) {
        return null;
    }
    const other = placed.items.findIndex((candidate) => candidate.key === key);
    const group = `photos-move:${String(Date.now())}`;
    const put = (target: string, placement: PhotoPlacement): void => {
        if (!before.has(target)) {
            before.set(target, session.edition.elements[target]);
        }
        const icon = session.edition.elements[target]?.icon;
        editElement(
            session,
            target,
            {
                ...(icon === undefined ? {} : { icon: undefined }),
                photo: placement,
            },
            group,
        );
    };
    const items = placed.items.slice();
    const swapped = items[other];
    if (swapped !== undefined) {
        // Two photos of this choice trade places.
        put(item.key, swapped.placement);
        items[other] = {
            ...swapped,
            key: item.key,
            label: labelOf(item.key),
        };
    } else {
        // The element it leaves goes back to how it was before the choice.
        const { change } = setElement(
            session.edition,
            item.key,
            before.get(item.key),
        );
        if (change !== null) {
            session.apply([change], group);
        }
    }
    put(key, item.placement);
    items[index] = { ...item, key, label: labelOf(key) };

    return items;
};

export type ChoiceDeps = {
    session: EditionSession;
    editKey: string | null;
    siblings: readonly string[];
    labelOf: (key: string) => string;
    before: Before;
    ingest: (file: File) => Promise<PhotoRecord | null>;
    preview: (file: File) => string;
    skipped: (count: number) => string;
};

export const placeChoice = async (
    deps: ChoiceDeps,
    files: File[],
): Promise<Placed | null> => {
    const { session, editKey, siblings, labelOf, before } = deps;
    // Files named after a space or a pawn go there (B237). The others: the first on this element, the rest only
    // on empty elements of the same kind (bug 7): never over a photo, never on a corner or a station when you
    // started on a street. From the list, a file without a matching name waits in the summary.
    const plan = planPhotoChoice(
        session.edition,
        editKey,
        siblings,
        files.map((file) => file.name),
        editKey === null || files.length > 1
            ? nameCandidates(session.edition, labelOf)
            : [],
    );
    const several = files.length > 1 || editKey === null;
    // The pool is read before the photos land, so the empty elements of the choice are still empty.
    const pool = several ? photoPool(session, editKey, siblings, labelOf) : [];
    // All photos of one choice are one undo step, and the list can put them back.
    const group = several ? `photos:${String(Date.now())}` : null;
    const items: PlacedPhoto[] = [];
    const missed: MissedPhoto[] = [];
    for (const [index, file] of files.entries()) {
        const target = plan.targets[index];
        if (target === null || target === undefined) {
            missed.push({ file, name: file.name, url: deps.preview(file) });
            continue;
        }
        const record = await deps.ingest(file);
        if (record === null) {
            continue;
        }
        const replaced =
            session.edition.elements[target.key]?.photo !== undefined;
        const placement = placePhoto(
            session,
            before,
            target.key,
            record,
            group,
        );
        items.push({
            key: target.key,
            label: labelOf(target.key),
            file: file.name,
            placement,
            how: target.how,
            replaced,
        });
    }

    return several && (items.length > 0 || missed.length > 0)
        ? {
              kind: 'batch',
              items,
              missed,
              note:
                  plan.skipped > 0 && items.some((item) => item.how === 'order')
                      ? deps.skipped(plan.skipped)
                      : '',
              undone: false,
              pool,
          }
        : null;
};

export const withMissedPlaced = (
    session: EditionSession,
    before: Before,
    batch: Batch,
    {
        index,
        key,
        record,
        label,
        file,
    }: {
        index: number;
        key: string;
        record: PhotoRecord;
        label: string;
        file: string;
    },
): Batch => {
    const replaced = session.edition.elements[key]?.photo !== undefined;
    const placement = placePhoto(
        session,
        before,
        key,
        record,
        `photos-move:${String(Date.now())}`,
    );

    return {
        ...batch,
        items: [
            ...batch.items,
            {
                key,
                label,
                file,
                placement,
                how: 'chosen',
                replaced,
            },
        ],
        missed: batch.missed.filter((_, at) => at !== index),
    };
};
