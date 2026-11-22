import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type DragEvent,
} from 'react';

import { useServices } from '@/hooks/use-editions';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';
import { setElement } from '@/lib/edition/changes';
import { BOARD_CENTER_KEY, INVITATION_KEY } from '@/lib/edition/keys';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition } from '@/lib/edition/types';
import type { ElementOverride, PhotoPlacement } from '@/lib/edition/types';
import { editElement } from '@/lib/editor/edit';
import { ingestPhoto } from '@/lib/editor/ingest';
import { planPhotoBatch } from '@/lib/editor/photo-batch';
import type { PhotoCache } from '@/lib/editor/photo-cache';
import { startingPlacement } from '@/lib/editor/placements';
import { isTypingTarget } from '@/lib/editor/shortcuts';
import type { PhotoError } from '@/lib/photos/validation';

/** One photo of a choice of several, and the element it went on (ronde 3, UX 1). */
interface PlacedPhoto {
    key: string;
    label: string;
    file: string;
    /** The placement it got, so the list can move it to another element (UX 4, ronde 4). */
    placement: PhotoPlacement;
}

/**
 * What the panel says after photos went somewhere. A choice of several photos stays as a list "photo → element" with
 * one Ongedaan maken, until the next choice; a paste problem is a plain message.
 */
export type Placed =
    | { kind: 'message'; text: string }
    | {
          kind: 'batch';
          items: PlacedPhoto[];
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

interface PhotoUploadOptions {
    session: EditionSession;
    edition: Edition;
    editKey: string;
    cache: PhotoCache;
    /** Elements after this one in the list, for a choice of several files. */
    siblings: readonly string[];
    /** Whether the element shows a photo now, so a paste or a drop has a place. */
    canHold: boolean;
    /** The name of an element, for the message after several photos. */
    labelOf: (key: string) => string;
}

export interface PhotoUpload {
    uploads: Upload[];
    /** A message after a choice of several photos or a paste. */
    placed: Placed | null;
    /** Puts every element of the last choice of several photos back as it was, in one step. */
    undoPlaced: () => void;
    /** Closes the list after a choice of several photos. */
    dismissPlaced: () => void;
    /** Moves photo `index` of the last choice to another element; a photo already there trades places (UX 4). */
    movePlaced: (index: number, key: string) => void;
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
}

/**
 * Choosing, dropping and pasting photos on an element (B93): one file goes on the element, several fill the
 * next elements that can show one. Ctrl/Cmd+V with an image on the clipboard works outside text fields.
 */
export function usePhotoUpload({
    session,
    edition,
    editKey,
    cache,
    siblings,
    canHold,
    labelOf,
}: PhotoUploadOptions): PhotoUpload {
    const t = useTranslation();
    const tc = useTranslationChoice();
    const { repository } = useServices();
    const [uploads, setUploads] = useState<Upload[]>([]);
    const [placed, setPlaced] = useState<Placed | null>(null);
    // How the elements of the last choice of several photos were before it, for Ongedaan maken.
    const before = useRef<Map<string, ElementOverride | undefined>>(new Map());
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

    const assign = async (files: File[]): Promise<void> => {
        // A new choice replaces the errors of the previous one.
        setUploads((list) => list.filter((item) => item.kind === 'working'));
        setPlaced(null);
        // The first photo goes on this element; the others only on empty elements of the same kind (bug 7): never
        // over a photo that is already there, never on a corner or a station when you started on a street.
        const { targets, pool, skipped } = planPhotoBatch(
            session.edition,
            editKey,
            siblings,
            files.length,
        );
        const several = files.length > 1;
        // All photos of one choice are one undo step, and the list can put them back.
        const group = several ? `photos:${String(Date.now())}` : null;
        const items: PlacedPhoto[] = [];
        before.current = new Map();
        for (const [index, file] of files.entries()) {
            const key = targets[index];
            if (key === undefined) {
                break;
            }
            const result = await ingestPhoto(
                file,
                repository,
                edition.id,
                (stage) =>
                    setUploads((list) => [
                        ...list.filter(
                            (item) =>
                                item.kind !== 'working' ||
                                item.name !== file.name,
                        ),
                        { kind: 'working', name: file.name, stage },
                    ]),
            );
            setUploads((list) =>
                list.filter(
                    (item) =>
                        item.kind !== 'working' || item.name !== file.name,
                ),
            );
            if (!result.ok) {
                setUploads((list) => [
                    ...list,
                    'storageFull' in result
                        ? { kind: 'storage-full', name: result.fileName }
                        : { kind: 'error', error: result.error },
                ]);
                continue;
            }
            cache.add(result.record);
            // A photo replaces an icon of a special space (B136): the space shows one picture.
            const icon = session.edition.elements[key]?.icon;
            // A logo in the board centre starts whole and centred (Passend, B168): nothing of it is cut off.
            const logo =
                key === BOARD_CENTER_KEY &&
                session.edition.elements[key]?.centerMode === 'logo';
            if (several && !before.current.has(key)) {
                before.current.set(key, session.edition.elements[key]);
            }
            // The strip of the invitation is wide and low: every photo there starts whole (Passend), so a standing
            // drawing keeps its head (UX 4, Mila in ronde 4).
            const placement: PhotoPlacement =
                logo || key === INVITATION_KEY
                    ? {
                          ...startingPlacement(result.record.id, result.record),
                          cx: 0.5,
                          cy: 0.5,
                          fit: true,
                      }
                    : startingPlacement(result.record.id, result.record);
            editElement(
                session,
                key,
                {
                    ...(key === BOARD_CENTER_KEY && result.record.height > 0
                        ? {
                              photoAspect:
                                  result.record.width / result.record.height,
                          }
                        : {}),
                    ...(icon === undefined ? {} : { icon: undefined }),
                    // One photo per centre (B187): it takes the place of a photo over the whole centre.
                    ...(key === BOARD_CENTER_KEY
                        ? { background: undefined }
                        : {}),
                    photo: placement,
                },
                group,
            );
            items.push({
                key,
                label: labelOf(key),
                file: file.name,
                placement,
            });
        }
        if (several && items.length > 0) {
            setPlaced({
                kind: 'batch',
                items,
                note: [
                    skipped > 0 ? tc('editor.photos_skipped', skipped) : '',
                    files.length > targets.length
                        ? tc(
                              'editor.photos_leftover',
                              files.length - targets.length,
                          )
                        : '',
                ]
                    .filter((line) => line !== '')
                    .join(' '),
                undone: false,
                pool: pool.map((key) => ({ key, label: labelOf(key) })),
            });
        }
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
    }, []);

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
        dragging,
        canPasteButton,
        choose,
        paste,
        dropProps: {
            onDragOver: (event) => {
                if (canHold) {
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
}
