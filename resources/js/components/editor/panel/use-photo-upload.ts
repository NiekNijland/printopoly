import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type DragEvent,
} from 'react';

import { useServices } from '@/hooks/use-editions';
import { useTranslation } from '@/hooks/use-translation';
import { setElement } from '@/lib/edition/changes';
import { BOARD_CENTER_KEY } from '@/lib/edition/keys';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition } from '@/lib/edition/types';
import type { ElementOverride } from '@/lib/edition/types';
import { holdsPhoto } from '@/lib/editor/catalogue';
import { editElement } from '@/lib/editor/edit';
import { ingestPhoto } from '@/lib/editor/ingest';
import type { PhotoCache } from '@/lib/editor/photo-cache';
import { startingPlacement } from '@/lib/editor/placements';
import { isTypingTarget } from '@/lib/editor/shortcuts';
import type { PhotoError } from '@/lib/photos/validation';

/** One photo of a choice of several, and the element it went on (ronde 3, UX 1). */
export interface PlacedPhoto {
    key: string;
    label: string;
    file: string;
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
        // Only elements that show a photo get one: Chance, Community Chest and tax spaces are skipped.
        const candidates = [editKey, ...siblings];
        const eligible = candidates.filter(
            (candidate) => candidate === editKey || holdsPhoto(candidate),
        );
        const targets = eligible.slice(0, files.length);
        const last = targets.at(-1);
        const skipped =
            last === undefined
                ? 0
                : candidates
                      .slice(0, candidates.indexOf(last))
                      .filter((candidate) => !holdsPhoto(candidate)).length;
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
            if (several && !before.current.has(key)) {
                before.current.set(key, session.edition.elements[key]);
            }
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
                    photo: startingPlacement(result.record.id, result.record),
                },
                group,
            );
            items.push({ key, label: labelOf(key), file: file.name });
        }
        if (several && items.length > 0) {
            setPlaced({
                kind: 'batch',
                items,
                note: [
                    skipped > 0
                        ? t('editor.photos_skipped', { count: skipped })
                        : '',
                    files.length > targets.length
                        ? t('editor.photos_leftover', {
                              count: files.length - targets.length,
                          })
                        : '',
                ]
                    .filter((line) => line !== '')
                    .join(' '),
                undone: false,
            });
        }
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
