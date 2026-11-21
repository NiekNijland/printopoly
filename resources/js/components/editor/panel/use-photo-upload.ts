import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type DragEvent,
} from 'react';

import { useServices } from '@/hooks/use-editions';
import { useTranslation } from '@/hooks/use-translation';
import { BOARD_CENTER_KEY } from '@/lib/edition/keys';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition } from '@/lib/edition/types';
import { holdsPhoto } from '@/lib/editor/catalogue';
import { editElement } from '@/lib/editor/edit';
import { ingestPhoto } from '@/lib/editor/ingest';
import type { PhotoCache } from '@/lib/editor/photo-cache';
import { isTypingTarget } from '@/lib/editor/shortcuts';
import { defaultTransform } from '@/lib/photos/transform';
import type { PhotoError } from '@/lib/photos/validation';

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
    placed: string | null;
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
    const [placed, setPlaced] = useState<string | null>(null);
    const [uploadsKey, setUploadsKey] = useState(editKey);
    const [dragging, setDragging] = useState(false);
    // Errors belong to the element they were made for: another element starts clean.
    if (uploadsKey !== editKey) {
        setUploadsKey(editKey);
        setPlaced(null);
        setUploads((list) => list.filter((item) => item.kind === 'working'));
    }

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
        let count = 0;
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
            const base = defaultTransform();
            // A photo replaces an icon of a special space (B136): the space shows one picture.
            const icon = session.edition.elements[key]?.icon;
            editElement(session, key, {
                ...(key === BOARD_CENTER_KEY && result.record.height > 0
                    ? {
                          photoAspect:
                              result.record.width / result.record.height,
                      }
                    : {}),
                ...(icon === undefined ? {} : { icon: undefined }),
                photo: {
                    photoId: result.record.id,
                    cx: base.x,
                    cy: base.y,
                    scale: base.scale,
                    rotation: base.rotation,
                    grayscale: false,
                },
            });
            count += 1;
        }
        if (files.length > 1 && count > 0) {
            const first = targets[0];
            setPlaced(
                [
                    t('editor.photos_placed', {
                        count,
                        first: first === undefined ? '' : labelOf(first),
                        last: last === undefined ? '' : labelOf(last),
                    }),
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
            );
        }
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
            const { assign: place, canHold: hold, t: say } = latest.current;
            const files = [...(event.clipboardData?.files ?? [])].filter(
                (file) =>
                    file.type.startsWith('image/') ||
                    /\.hei[cf]$/i.test(file.name),
            );
            event.preventDefault();
            if (!hold) {
                setPlaced(say('editor.paste_no_place'));
            } else if (files.length === 0) {
                setPlaced(say('editor.paste_none'));
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
                setPlaced(t('editor.paste_none'));

                return;
            }
            await assign(files);
        } catch {
            setPlaced(t('editor.paste_denied'));
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
