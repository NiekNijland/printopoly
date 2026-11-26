import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type DragEvent,
} from 'react';

import { editElement } from '@/features/edition/editor/edit';
import { ingestPhoto } from '@/features/edition/editor/ingest';
import { isTypingTarget } from '@/features/edition/editor/shortcuts';
import type { PhotoError } from '@/features/edition/photos/validation';
import type { EditionSession } from '@/features/edition/session';
import { useServices } from '@/features/edition/use-editions';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';
import { setElement } from '@/lib/render/edition-changes';
import {
    BOARD_CENTER_KEY,
    BOX_LID_KEY,
    INVITATION_KEY,
    parseKey,
} from '@/lib/render/edition-keys';
import type {
    Edition,
    ElementOverride,
    PhotoPlacement,
    PhotoRecord,
} from '@/lib/render/edition-types';
import { holdsPhoto } from '@/lib/render/editor-catalogue';
import { photoKindOf } from '@/lib/render/editor-photo-batch';
import type { PhotoCache } from '@/lib/render/editor-photo-cache';
import {
    nameCandidates,
    planPhotoChoice,
} from '@/lib/render/editor-photo-match';
import {
    lidLogoPlacement,
    startingPlacement,
} from '@/lib/render/editor-placements';

/** One photo of a choice of several, and the element it went on (ronde 3, UX 1). */
type PlacedPhoto = {
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

type Upload =
    | { kind: 'working'; name: string; stage: 'converting' | 'resizing' }
    | { kind: 'error'; error: PhotoError }
    | { kind: 'storage-full'; name: string };

type PhotoUploadOptions = {
    session: EditionSession;
    edition: Edition;
    /** The open element; `null` for the photo button of the list, which places photos by name only (B237). */
    editKey: string | null;
    cache: PhotoCache;
    /** Elements after this one in the list, for a choice of several files. */
    siblings: readonly string[];
    /** Whether the element shows a photo now, so a paste or a drop has a place. */
    canHold: boolean;
    /** The name of an element, for the message after several photos and for matching file names (B237). */
    labelOf: (key: string) => string;
    /** Ctrl/Cmd+V puts an image on this element; only one upload on the page may listen. */
    pasteShortcut?: boolean;
};

export type PhotoUpload = {
    uploads: Upload[];
    /** A message after a choice of several photos or a paste. */
    placed: Placed | null;
    /** Puts every element of the last choice of several photos back as it was, in one step. */
    undoPlaced: () => void;
    /** Closes the list after a choice of several photos. */
    dismissPlaced: () => void;
    /** Moves photo `index` of the last choice to another element; a photo already there trades places (UX 4). */
    movePlaced: (index: number, key: string) => void;
    /** Puts photo `index` of the photos that found no element on an element (B237). */
    placeMissed: (index: number, key: string) => Promise<void>;
    /** Opens a choice of several photos straight away, as a drop does: the photo button of the list. */
    assign: (files: File[]) => Promise<void>;
    dragging: boolean;
    /** Whether the browser lets a button read the clipboard (Chrome, Safari; not Firefox). */
    canPasteButton: boolean;
    choose: (event: ChangeEvent<HTMLInputElement>) => void;
    paste: () => Promise<void>;
    dropProps: {
        onDragOver: (event: DragEvent<HTMLElement>) => void;
        onDragLeave: () => void;
        onDrop: (event: DragEvent<HTMLElement>) => void;
    };
};

/**
 * Choosing, dropping and pasting photos on an element (B93): one file goes on the element, several fill the
 * next elements that can show one. Ctrl/Cmd+V with an image on the clipboard works outside text fields.
 */
export const usePhotoUpload = ({
    session,
    edition,
    editKey,
    cache,
    siblings,
    canHold,
    labelOf,
    pasteShortcut = true,
}: PhotoUploadOptions): PhotoUpload => {
    const t = useTranslation();
    const tc = useTranslationChoice();
    const { repository } = useServices();
    const [uploads, setUploads] = useState<Upload[]>([]);
    const [placed, setPlaced] = useState<Placed | null>(null);
    // How the elements of the last choice of several photos were before it, for Ongedaan maken.
    const before = useRef<Map<string, ElementOverride | undefined>>(new Map());
    // Previews of photos that found no place, freed at the next choice and when the editor closes.
    const previews = useRef<string[]>([]);
    const freePreviews = (): void => {
        previews.current.forEach((url) => URL.revokeObjectURL(url));
        previews.current = [];
    };
    useEffect(() => freePreviews, []);
    const [uploadsKey, setUploadsKey] = useState(editKey);
    const [dragging, setDragging] = useState(false);
    // Errors belong to the element they were made for: another element starts clean. The list after several
    // photos stays, so you can walk through the elements and still undo it.
    if (uploadsKey !== editKey) {
        setUploadsKey(editKey);
        setPlaced((current) => (current?.kind === 'batch' ? current : null));
        setUploads((list) => list.filter((item) => item.kind === 'working'));
    }
    const say = (text: string): void => setPlaced({ kind: 'message', text });

    /** Reads a file into this browser's photos; `null` when it could not be used (the error shows). */
    const ingest = async (file: File): Promise<PhotoRecord | null> => {
        const result = await ingestPhoto(
            file,
            repository,
            edition.id,
            (stage) =>
                setUploads((list) => [
                    ...list.filter(
                        (item) =>
                            item.kind !== 'working' || item.name !== file.name,
                    ),
                    { kind: 'working', name: file.name, stage },
                ]),
        );
        setUploads((list) =>
            list.filter(
                (item) => item.kind !== 'working' || item.name !== file.name,
            ),
        );
        if (!result.ok) {
            setUploads((list) => [
                ...list,
                'storageFull' in result
                    ? { kind: 'storage-full', name: result.fileName }
                    : { kind: 'error', error: result.error },
            ]);

            return null;
        }
        cache.add(result.record);

        return result.record;
    };

    /** Puts a new photo on `key`, remembering how the element was for Ongedaan maken. */
    const place = (
        key: string,
        record: PhotoRecord,
        group: string | null,
    ): PhotoPlacement => {
        const now = session.edition.elements[key];
        // A photo replaces an icon of a special space (B136): the space shows one picture.
        const icon = now?.icon;
        // A logo in the board centre starts whole and centred (Passend, B168): nothing of it is cut off.
        const logo = key === BOARD_CENTER_KEY && now?.centerMode === 'logo';
        if (group !== null && !before.current.has(key)) {
            before.current.set(key, now);
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
            now?.photo !== undefined &&
            lid?.photo?.photoId === now.photo.photoId;
        const step =
            group ?? (lidFollows ? `logo:${String(Date.now())}` : null);
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
            if (group !== null && !before.current.has(BOX_LID_KEY)) {
                before.current.set(BOX_LID_KEY, lid);
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
    const poolFor = (): { key: string; label: string }[] => {
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

    const assign = async (files: File[]): Promise<void> => {
        // A new choice replaces the errors of the previous one.
        setUploads((list) => list.filter((item) => item.kind === 'working'));
        setPlaced(null);
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
        const pool = several ? poolFor() : [];
        // All photos of one choice are one undo step, and the list can put them back.
        const group = several ? `photos:${String(Date.now())}` : null;
        const items: PlacedPhoto[] = [];
        const missed: MissedPhoto[] = [];
        before.current = new Map();
        freePreviews();
        for (const [index, file] of files.entries()) {
            const target = plan.targets[index];
            if (target === null || target === undefined) {
                const url =
                    typeof URL.createObjectURL === 'function'
                        ? URL.createObjectURL(file)
                        : '';
                if (url !== '') {
                    previews.current.push(url);
                }
                missed.push({ file, name: file.name, url });
                continue;
            }
            const record = await ingest(file);
            if (record === null) {
                continue;
            }
            const replaced =
                session.edition.elements[target.key]?.photo !== undefined;
            const placement = place(target.key, record, group);
            items.push({
                key: target.key,
                label: labelOf(target.key),
                file: file.name,
                placement,
                how: target.how,
                replaced,
            });
        }
        if (several && (items.length > 0 || missed.length > 0)) {
            setPlaced({
                kind: 'batch',
                items,
                missed,
                note:
                    plan.skipped > 0 &&
                    items.some((item) => item.how === 'order')
                        ? tc('editor.photos_skipped', plan.skipped)
                        : '',
                undone: false,
                pool,
            });
        }
    };

    const placeMissed = async (index: number, key: string): Promise<void> => {
        if (placed?.kind !== 'batch' || placed.undone) {
            return;
        }
        const photo = placed.missed[index];
        if (
            photo === undefined ||
            placed.items.some((item) => item.key === key)
        ) {
            return;
        }
        const record = await ingest(photo.file);
        if (record === null) {
            return;
        }
        const replaced = session.edition.elements[key]?.photo !== undefined;
        const placement = place(
            key,
            record,
            `photos-move:${String(Date.now())}`,
        );
        setPlaced({
            ...placed,
            items: [
                ...placed.items,
                {
                    key,
                    label: labelOf(key),
                    file: photo.name,
                    placement,
                    how: 'chosen',
                    replaced,
                },
            ],
            missed: placed.missed.filter((_, at) => at !== index),
        });
    };

    const movePlaced = (index: number, key: string): void => {
        if (placed?.kind !== 'batch' || placed.undone) {
            return;
        }
        const item = placed.items[index];
        if (item === undefined || item.key === key) {
            return;
        }
        const other = placed.items.findIndex(
            (candidate) => candidate.key === key,
        );
        const group = `photos-move:${String(Date.now())}`;
        const put = (target: string, placement: PhotoPlacement): void => {
            if (!before.current.has(target)) {
                before.current.set(target, session.edition.elements[target]);
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
                before.current.get(item.key),
            );
            if (change !== null) {
                session.apply([change], group);
            }
        }
        put(key, item.placement);
        items[index] = { ...item, key, label: labelOf(key) };
        setPlaced({ ...placed, items });
    };

    const undoPlaced = (): void => {
        const changes = [...before.current.entries()].flatMap(
            ([key, override]) => {
                const { change } = setElement(session.edition, key, override);

                return change === null ? [] : [change];
            },
        );
        session.apply(changes);
        before.current = new Map();
        setPlaced((current) =>
            current?.kind === 'batch' ? { ...current, undone: true } : current,
        );
    };

    // Ctrl/Cmd+V with an image on the clipboard puts it on the chosen element, outside text fields.
    const latest = useRef({ assign, canHold, t });
    useEffect(() => {
        latest.current = { assign, canHold, t };
    });
    useEffect(() => {
        if (!pasteShortcut) {
            return undefined;
        }
        const onPaste = (event: ClipboardEvent): void => {
            if (
                event.defaultPrevented ||
                isTypingTarget(event.target) ||
                document.querySelector('[role="dialog"][data-state="open"]') !==
                    null
            ) {
                return;
            }
            const { assign: place, canHold: hold, t: tr } = latest.current;
            const files = [...(event.clipboardData?.files ?? [])].filter(
                (file) =>
                    file.type.startsWith('image/') ||
                    /\.hei[cf]$/i.test(file.name),
            );
            event.preventDefault();
            if (!hold) {
                setPlaced({
                    kind: 'message',
                    text: tr('editor.paste_no_place'),
                });
            } else if (files.length === 0) {
                setPlaced({ kind: 'message', text: tr('editor.paste_none') });
            } else {
                void place(files);
            }
        };
        document.addEventListener('paste', onPaste);

        return () => document.removeEventListener('paste', onPaste);
    }, [pasteShortcut]);

    // The editor only renders in the browser (B78), so this may look at the browser right away.
    const canPasteButton =
        typeof navigator !== 'undefined' &&
        typeof navigator.clipboard?.read === 'function';

    const paste = async (): Promise<void> => {
        try {
            const files: File[] = [];
            for (const item of await navigator.clipboard.read()) {
                const type = item.types.find((candidate) =>
                    candidate.startsWith('image/'),
                );
                if (type !== undefined) {
                    const blob = await item.getType(type);
                    files.push(
                        new File(
                            [blob],
                            `plakken.${type.split('/')[1] ?? 'png'}`,
                            { type },
                        ),
                    );
                }
            }
            if (files.length === 0) {
                say(t('editor.paste_none'));

                return;
            }
            await assign(files);
        } catch {
            say(t('editor.paste_denied'));
        }
    };

    const choose = (event: ChangeEvent<HTMLInputElement>): void => {
        const files = [...(event.target.files ?? [])];
        event.target.value = '';
        if (files.length > 0) {
            void assign(files);
        }
    };

    return {
        uploads,
        placed,
        undoPlaced,
        dismissPlaced: () => setPlaced(null),
        movePlaced,
        placeMissed,
        assign,
        dragging,
        canPasteButton,
        choose,
        paste,
        dropProps: {
            onDragOver: (event) => {
                // Only files: a photo dragged from row to row in the list is a swap (B238), not an upload.
                const types = event.dataTransfer?.types as
                    readonly string[] | undefined;
                if (
                    canHold &&
                    (types === undefined || [...types].includes('Files'))
                ) {
                    event.preventDefault();
                    setDragging(true);
                }
            },
            onDragLeave: () => setDragging(false),
            onDrop: (event) => {
                event.preventDefault();
                setDragging(false);
                const files = [...event.dataTransfer.files];
                if (files.length > 0 && canHold) {
                    void assign(files);
                }
            },
        },
    };
};
