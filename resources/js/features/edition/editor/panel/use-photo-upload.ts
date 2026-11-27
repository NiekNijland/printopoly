import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type DragEvent,
} from 'react';

import {
    movePhoto,
    placeChoice,
    withMissedPlaced,
    undoChanges,
    type Before,
    type Placed,
} from '@/features/edition/editor/panel/place-photo';
import {
    usePhotoIngest,
    type Upload,
} from '@/features/edition/editor/panel/use-photo-ingest';
import { isTypingTarget } from '@/features/edition/editor/shortcuts';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';
import { listenToDocument } from '@/lib/dom-events';
import type { Edition, PhotoRecord } from '@/lib/render/edition-types';
import type { PhotoCache } from '@/lib/render/editor-photo-cache';

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

type Latest = {
    assign: (files: File[]) => Promise<void>;
    canHold: boolean;
    t: ReturnType<typeof useTranslation>;
    say: (text: string) => void;
};

// Ctrl/Cmd+V with an image on the clipboard puts it on the chosen element, outside text fields.
const usePasteShortcut = (pasteShortcut: boolean, latest: Latest): void => {
    const current = useRef(latest);
    useEffect(() => {
        current.current = latest;
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
            const {
                assign: place,
                canHold: hold,
                t: tr,
                say,
            } = current.current;
            const files = [...(event.clipboardData?.files ?? [])].filter(
                (file) =>
                    file.type.startsWith('image/') ||
                    /\.hei[cf]$/i.test(file.name),
            );
            event.preventDefault();
            if (!hold) {
                say(tr('editor.paste_no_place'));
            } else if (files.length === 0) {
                say(tr('editor.paste_none'));
            } else {
                void place(files);
            }
        };
        return listenToDocument('paste', onPaste);
    }, [pasteShortcut]);
};

const clipboardImages = async (clipboard: Clipboard): Promise<File[]> => {
    const files: File[] = [];
    for (const item of await clipboard.read()) {
        const type = item.types.find((candidate) =>
            candidate.startsWith('image/'),
        );
        if (type !== undefined) {
            const blob = await item.getType(type);
            files.push(
                new File([blob], `plakken.${type.split('/')[1] ?? 'png'}`, {
                    type,
                }),
            );
        }
    }

    return files;
};

// The editor only renders in the browser (B78), so this may look at the browser right away.
const browserClipboard = (): Clipboard | undefined =>
    typeof navigator === 'undefined' ? undefined : navigator.clipboard;

const carriesFiles = (transfer: DataTransfer | undefined): boolean =>
    transfer === undefined || [...transfer.types].includes('Files');

const useDrop = (
    canHold: boolean,
    assign: (files: File[]) => Promise<void>,
): Pick<PhotoUpload, 'dragging' | 'dropProps'> => {
    const [dragging, setDragging] = useState(false);

    return {
        dragging,
        dropProps: {
            onDragOver: (event) => {
                // Only files: a photo dragged from row to row in the list is a swap (B238), not an upload.
                if (canHold && carriesFiles(event.dataTransfer)) {
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

// Previews of photos that found no place, freed at the next choice and when the editor closes.
const usePreviews = () => {
    const previews = useRef<string[]>([]);
    const free = (): void => {
        previews.current.forEach((url) => URL.revokeObjectURL(url));
        previews.current = [];
    };
    useEffect(() => free, []);
    const preview = (file: File): string => {
        const url =
            typeof URL.createObjectURL === 'function'
                ? URL.createObjectURL(file)
                : '';
        if (url !== '') {
            previews.current.push(url);
        }

        return url;
    };

    return { free, preview };
};

const usePlacedPhotos = (
    session: EditionSession,
    labelOf: (key: string) => string,
    ingest: (file: File) => Promise<PhotoRecord | null>,
) => {
    const [placed, setPlaced] = useState<Placed | null>(null);
    // How the elements of the last choice of several photos were before it, for Ongedaan maken.
    const before = useRef<Before>(new Map());
    const say = (text: string): void => setPlaced({ kind: 'message', text });
    const batch = placed?.kind === 'batch' && !placed.undone ? placed : null;

    const placeMissed = async (index: number, key: string): Promise<void> => {
        const photo = batch?.missed[index];
        if (
            batch === null ||
            photo === undefined ||
            batch.items.some((item) => item.key === key)
        ) {
            return;
        }
        const record = await ingest(photo.file);
        if (record === null) {
            return;
        }
        setPlaced(
            withMissedPlaced(session, before.current, batch, {
                index,
                key,
                record,
                label: labelOf(key),
                file: photo.name,
            }),
        );
    };

    return {
        placed,
        setPlaced,
        say,
        startChoice: (): Before => {
            before.current = new Map();

            return before.current;
        },
        undoPlaced: () => {
            undoChanges(session, before.current);
            before.current = new Map();
            setPlaced((current) =>
                current?.kind === 'batch'
                    ? { ...current, undone: true }
                    : current,
            );
        },
        dismissPlaced: () => setPlaced(null),
        movePlaced: (index: number, key: string) => {
            const items =
                batch === null
                    ? null
                    : movePhoto(
                          session,
                          before.current,
                          batch,
                          index,
                          key,
                          labelOf,
                      );
            if (batch !== null && items !== null) {
                setPlaced({ ...batch, items });
            }
        },
        placeMissed,
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
    const { uploads, setUploads, ingest } = usePhotoIngest(edition, cache);
    const { setPlaced, say, startChoice, ...list } = usePlacedPhotos(
        session,
        labelOf,
        ingest,
    );
    const previews = usePreviews();
    const [uploadsKey, setUploadsKey] = useState(editKey);
    // Errors belong to the element they were made for: another element starts clean. The list after several
    // photos stays, so you can walk through the elements and still undo it.
    if (uploadsKey !== editKey) {
        setUploadsKey(editKey);
        setPlaced((current) => (current?.kind === 'batch' ? current : null));
        setUploads((list) => list.filter((item) => item.kind === 'working'));
    }

    const assign = async (files: File[]): Promise<void> => {
        // A new choice replaces the errors of the previous one.
        setUploads((list) => list.filter((item) => item.kind === 'working'));
        setPlaced(null);
        const before = startChoice();
        previews.free();
        const result = await placeChoice(
            {
                session,
                editKey,
                siblings,
                labelOf,
                before,
                ingest,
                preview: previews.preview,
                skipped: (count) => tc('editor.photos_skipped', count),
            },
            files,
        );
        if (result !== null) {
            setPlaced(result);
        }
    };

    usePasteShortcut(pasteShortcut, { assign, canHold, t, say });
    const clipboard = browserClipboard();
    const drop = useDrop(canHold, assign);

    return {
        uploads,
        ...list,
        assign,
        canPasteButton: typeof clipboard?.read === 'function',
        choose: (event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = '';
            if (files.length > 0) {
                void assign(files);
            }
        },
        paste: async () => {
            try {
                const files = await clipboardImages(navigator.clipboard);
                if (files.length === 0) {
                    say(t('editor.paste_none'));

                    return;
                }
                await assign(files);
            } catch {
                say(t('editor.paste_denied'));
            }
        },
        ...drop,
    };
};
