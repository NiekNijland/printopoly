import { usePage } from '@inertiajs/react';
import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react';

import { CenterBackground } from '@/components/editor/center-background';
import { PhotoStyleChoice } from '@/components/editor/photo-style-choice';
import {
    IconPresetGrid,
    IconUpload,
    iconChoiceOf,
} from '@/components/editor/space-icon-picker';
import { PatternPicker } from '@/components/editor/style-controls';
import { CloseIcon, HandIcon, WarningIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useKeyboardHints } from '@/hooks/use-media-query';
import { useTranslation } from '@/hooks/use-translation';
import type { ElementKind } from '@/lib/edition/keys';
import { spaceKey } from '@/lib/edition/keys';
import type { ResolvedEdition } from '@/lib/edition/resolve';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition, ElementOverride } from '@/lib/edition/types';
import { CENTER_MODES, type CenterMode } from '@/lib/edition/types';
import { deedKeyForSpace, holdsPhoto } from '@/lib/editor/catalogue';
import { editElement } from '@/lib/editor/edit';
import type { PhotoCache } from '@/lib/editor/photo-cache';
import {
    placementDpi,
    type PlacementAction,
    type PlacementContext,
} from '@/lib/editor/placements';
import { shortcutKeys } from '@/lib/editor/shortcuts';
import type { Space } from '@/lib/game/types';
import { resolutionLabel } from '@/lib/photos/resolution';
import { MAX_ZOOM, minZoom } from '@/lib/photos/transform';
import { THEMES } from '@/lib/render/themes';

import { ChoiceRow, type ChoiceOption } from './panel-parts';
import type { Placed, PhotoUpload } from './use-photo-upload';

const ACCEPT =
    'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';

/** What an element shows in its Afbeelding section (§3.4). */
type ImageChoice =
    'none' | 'photo' | 'standard' | 'preset' | 'upload' | 'pattern';

interface ImageSectionProps {
    session: EditionSession;
    edition: Edition;
    resolved: ResolvedEdition;
    editKey: string;
    kind: ElementKind;
    /** The space of a special space (station, tax, corner...), for its icons (B136). */
    iconSpace: Space | undefined;
    /** Whether the In kader / Hele vak choice applies once there is a photo (B124). */
    photoStyle: boolean;
    context: PlacementContext | null;
    onAct: (action: PlacementAction, announcement?: string) => void;
    cache: PhotoCache;
    upload: PhotoUpload;
}

/** A short line that says where a photo goes, for elements where that is not obvious. */
function whereKey(kind: ElementKind, space: Space | undefined): string | null {
    switch (kind) {
        case 'rulesBooklet':
            return 'editor.image_where_rulesBooklet';
        case 'foldModels':
            return 'editor.image_where_foldModels';
        case 'dice':
            return 'editor.image_where_dice';
        case 'pawn':
            return 'editor.image_where_pawn';
        case 'note':
            return 'editor.image_where_note';
        case 'space':
            return space?.type === 'station' || space?.type === 'utility'
                ? 'editor.image_where_deed'
                : null;
        default:
            return null;
    }
}

/**
 * The Afbeelding section (§3.4, B141): one row with only the choices the element has, then the tools for that
 * choice. Photo tools (In kader / Hele vak, zoom, a quarter turn, black and white) come after a photo is chosen.
 */
export function ImageSection({
    session,
    edition,
    resolved,
    editKey,
    kind,
    iconSpace,
    photoStyle,
    context,
    onAct,
    cache,
    upload,
}: ImageSectionProps) {
    const t = useTranslation();
    const hints = useKeyboardHints();
    const override: ElementOverride | undefined = edition.elements[editKey];
    const placement = override?.photo;
    const fileInput = useRef<HTMLInputElement>(null);
    // A choice that waits for its next step (a file, an icon) until the element really changes.
    const [pending, setPending] = useState<{
        key: string;
        choice: ImageChoice;
    } | null>(null);
    const waiting = pending?.key === editKey ? pending.choice : null;
    const wait = (choice: ImageChoice): void =>
        setPending({ key: editKey, choice });
    const openFiles = (): void => fileInput.current?.click();
    // Without a photo the P shortcut and a photo warning land on the Foto choice, with one on "Andere foto".
    const photoField: Partial<Record<ImageChoice, string>> =
        placement === undefined ? { photo: 'photo' } : {};

    const clear = (patch: Partial<ElementOverride>): void => {
        const now = session.edition.elements[editKey];
        const changed = (Object.keys(patch) as (keyof ElementOverride)[]).some(
            (field) => now?.[field] !== undefined,
        );
        if (changed) {
            editElement(session, editKey, patch);
        }
    };

    // A street, station or utility: its photo is on the title deed too, unless switched off (B157).
    const spacePosition =
        kind === 'space' ? Number(editKey.split('.')[1]) : undefined;
    const ownDeedKey =
        spacePosition === undefined || !edition.parts.deeds
            ? undefined
            : deedKeyForSpace(spacePosition);
    const deedLine =
        ownDeedKey === undefined ? null : edition.elements[ownDeedKey]
              ?.photo !== undefined ? (
            <p className="m-0 text-sm text-ink-soft" data-field="deed-photo">
                {t('editor.deed_photo_own')}
            </p>
        ) : (
            <label className="flex min-h-11 items-center gap-2 text-base">
                <input
                    type="checkbox"
                    className="size-5 accent-ink"
                    checked={override?.deedPhoto !== false}
                    data-field="deed-photo"
                    onChange={(event) =>
                        editElement(session, editKey, {
                            deedPhoto: event.target.checked ? undefined : false,
                        })
                    }
                />
                {t('editor.deed_photo_also')}
            </label>
        );

    const photoPart = (
        <PhotoTools
            session={session}
            editKey={editKey}
            override={override}
            photoStyle={photoStyle}
            fitChoice={kind !== 'boardCenter'}
            extra={deedLine}
            context={context}
            onAct={onAct}
            cache={cache}
            upload={upload}
            onChoose={openFiles}
        />
    );
    const fileField = (
        <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            data-testid="photo-input"
            onChange={upload.choose}
        />
    );
    const where = whereKey(kind, iconSpace);
    const status = <UploadStatus upload={upload} />;

    if (kind === 'boardCenter') {
        return (
            <CenterImage
                session={session}
                edition={edition}
                resolved={resolved}
                editKey={editKey}
                override={override}
                cache={cache}
                photoPart={photoPart}
                fileField={fileField}
                status={status}
            />
        );
    }

    if (iconSpace !== undefined) {
        const canPhoto = holdsPhoto(editKey);
        const current: ImageChoice =
            placement !== undefined
                ? 'photo'
                : iconChoiceOf(override?.icon) === 'standard'
                  ? (waiting ?? 'standard')
                  : iconChoiceOf(override?.icon);
        const options: ChoiceOption<ImageChoice>[] = [
            { id: 'standard', label: t('editor.image_icon_standard') },
            { id: 'preset', label: t('editor.image_icon_other') },
            { id: 'upload', label: t('editor.image_own') },
            ...(canPhoto
                ? [{ id: 'photo' as const, label: t('editor.image_photo') }]
                : []),
        ];

        return (
            <>
                <ChoiceRow
                    fields={photoField}
                    label={t('editor.section_image')}
                    options={options}
                    value={current}
                    onChange={(next) => {
                        wait(next);
                        if (next === 'standard') {
                            clear({ icon: undefined, photo: undefined });
                        } else if (next === 'photo') {
                            if (placement === undefined) openFiles();
                        } else if (next === 'upload') {
                            if (iconChoiceOf(override?.icon) !== 'upload') {
                                clear({ photo: undefined });
                            }
                        } else if (next === 'preset') {
                            clear({ photo: undefined });
                        }
                    }}
                />
                {canPhoto && fileField}
                {current === 'preset' && (
                    <IconPresetGrid
                        session={session}
                        edition={edition}
                        editKey={editKey}
                        space={iconSpace}
                    />
                )}
                {current === 'upload' && (
                    <IconUpload
                        session={session}
                        edition={edition}
                        editKey={editKey}
                        cache={cache}
                    />
                )}
                {current === 'photo' && photoPart}
                {where !== null && current !== 'photo' && (
                    <p className="m-0 text-xs text-ink-soft">{t(where)}</p>
                )}
                {status}
            </>
        );
    }

    if (kind === 'deed') {
        return (
            <DeedImage
                session={session}
                edition={edition}
                resolved={resolved}
                editKey={editKey}
                waiting={waiting}
                onWait={wait}
                openFiles={openFiles}
                photoPart={photoPart}
                fileField={fileField}
                status={status}
            />
        );
    }

    if (kind === 'cardBack') {
        const deck = editKey.split('.')[1];
        const patterns = deck === 'chance' || deck === 'chest';
        const accent =
            THEMES[edition.theme].deckAccent[
                deck === 'chest' ? 'chest' : 'chance'
            ];
        const current: ImageChoice =
            placement !== undefined
                ? 'photo'
                : override?.pattern !== undefined
                  ? 'pattern'
                  : (waiting ?? 'standard');
        const options: ChoiceOption<ImageChoice>[] = [
            { id: 'standard', label: t('editor.image_back_standard') },
            ...(patterns
                ? [{ id: 'pattern' as const, label: t('editor.image_pattern') }]
                : []),
            { id: 'photo', label: t('editor.image_photo') },
        ];

        return (
            <>
                <ChoiceRow
                    fields={photoField}
                    label={t('editor.section_image')}
                    options={options}
                    value={current}
                    onChange={(next) => {
                        wait(next);
                        if (next === 'standard') {
                            clear({ photo: undefined, pattern: undefined });
                        } else if (next === 'pattern') {
                            clear({ photo: undefined });
                        } else if (placement === undefined) {
                            clear({ pattern: undefined });
                            openFiles();
                        }
                    }}
                />
                {fileField}
                {current === 'pattern' && patterns && (
                    <PatternPicker
                        label={t('editor.style_back_pattern')}
                        value={override?.pattern}
                        withNone={false}
                        color={accent}
                        onChange={(pattern) =>
                            editElement(session, editKey, {
                                pattern,
                                photo: undefined,
                            })
                        }
                    />
                )}
                {current === 'photo' && photoPart}
                {status}
            </>
        );
    }

    // Everything else: no picture or a photo. The box lid shows the theme without one.
    const current: ImageChoice =
        placement !== undefined ? 'photo' : (waiting ?? 'none');
    const options: ChoiceOption<ImageChoice>[] = [
        {
            id: 'none',
            label:
                kind === 'boxLid'
                    ? t('editor.image_theme')
                    : t('editor.image_none'),
        },
        {
            id: 'photo',
            label:
                kind === 'note'
                    ? t('editor.image_photo_oval')
                    : t('editor.image_photo'),
        },
    ];

    return (
        <>
            <ChoiceRow
                fields={photoField}
                label={t('editor.section_image')}
                options={options}
                value={current}
                onChange={(next) => {
                    wait(next);
                    if (next === 'none') {
                        clear({ photo: undefined });
                    } else if (placement === undefined) {
                        openFiles();
                    }
                }}
            />
            {fileField}
            {current === 'photo' && photoPart}
            {current === 'none' && hints && (
                <p className="m-0 text-xs text-ink-soft">
                    {t('editor.photo_hint_keys', {
                        keys: shortcutKeys('paste'),
                    })}
                </p>
            )}
            {where !== null && (
                <p className="m-0 text-xs text-ink-soft">{t(where)}</p>
            )}
            {status}
        </>
    );
}

interface PhotoToolsProps {
    session: EditionSession;
    editKey: string;
    override: ElementOverride | undefined;
    photoStyle: boolean;
    /** Whether Vullend / Passend applies (B168): everywhere but the photo over the whole board centre. */
    fitChoice: boolean;
    /** A line under the photo, such as "Ook op het eigendomsbewijs" on a street (B157). */
    extra?: ReactNode;
    context: PlacementContext | null;
    onAct: (action: PlacementAction, announcement?: string) => void;
    cache: PhotoCache;
    upload: PhotoUpload;
    onChoose: () => void;
}

/** "Foto kiezen" before a photo; after it the photo with "Andere foto" and its tools. */
function PhotoTools({
    session,
    editKey,
    override,
    photoStyle,
    fitChoice,
    extra,
    context,
    onAct,
    cache,
    upload,
    onChoose,
}: PhotoToolsProps) {
    const t = useTranslation();
    const { locale } = usePage().props;
    const hints = useKeyboardHints();
    const photos = useSyncExternalStore(cache.subscribe, cache.getSnapshot);
    const placement = override?.photo;
    const zoomPercent = Math.round((placement?.scale ?? 1) * 100);
    const fit = placement?.fit === true;
    const minPercent = Math.round(minZoom({ fit }) * 100);
    const dpi =
        placement !== undefined && context !== null
            ? placementDpi(placement, context)
            : null;
    const paste = upload.canPasteButton && (
        <Button variant="secondary" onClick={() => void upload.paste()}>
            {t('editor.photo_paste')}
        </Button>
    );

    if (placement === undefined) {
        return (
            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                    <Button
                        data-field="photo"
                        variant="secondary"
                        onClick={onChoose}
                    >
                        {t('editor.photo_choose')}
                    </Button>
                    {paste}
                </div>
                {hints && (
                    <p className="m-0 text-xs text-ink-soft">
                        {t('editor.photo_hint_keys', {
                            keys: shortcutKeys('paste'),
                        })}
                    </p>
                )}
            </div>
        );
    }

    const thumb = photos.get(placement.photoId)?.url;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3 rounded-control border-2 border-ink bg-paper p-3">
                <span
                    aria-hidden="true"
                    className="size-14 shrink-0 overflow-hidden rounded-control border border-line-strong bg-table"
                >
                    {thumb !== undefined && (
                        <img
                            src={thumb}
                            alt=""
                            className="size-full object-cover"
                            style={{
                                filter: placement.grayscale
                                    ? 'grayscale(1)'
                                    : undefined,
                            }}
                        />
                    )}
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                    <Button
                        data-field="photo"
                        variant="secondary"
                        className="px-4 min-[400px]:px-4"
                        onClick={onChoose}
                    >
                        {t('editor.photo_replace')}
                    </Button>
                    {paste}
                </div>
            </div>

            {extra}

            {photoStyle && (
                <PhotoStyleChoice
                    value={override?.photoStyle ?? 'framed'}
                    onChange={(style) =>
                        editElement(session, editKey, {
                            photoStyle: style === 'full' ? 'full' : undefined,
                        })
                    }
                />
            )}

            {fitChoice && (
                <ChoiceRow<'fill' | 'fit'>
                    name={t('editor.photo_fit')}
                    label={t('editor.photo_fit')}
                    fields={{ fill: 'photo-fit' }}
                    options={[
                        { id: 'fill', label: t('editor.photo_fit_fill') },
                        { id: 'fit', label: t('editor.photo_fit_fit') },
                    ]}
                    value={fit ? 'fit' : 'fill'}
                    onChange={(next) =>
                        onAct(
                            { type: 'fit', on: next === 'fit' },
                            next === 'fit'
                                ? t('editor.photo_fit_announce_fit')
                                : t('editor.photo_fit_announce_fill'),
                        )
                    }
                />
            )}

            <div className="flex items-end gap-2">
                <Button
                    variant="icon"
                    aria-label={t('editor.zoom_out')}
                    disabled={context === null}
                    onClick={() =>
                        onAct(
                            { type: 'zoom-by', delta: -0.1 },
                            t('editor.zoom_announce', {
                                percent: Math.max(minPercent, zoomPercent - 10),
                            }),
                        )
                    }
                >
                    −
                </Button>
                <label className="flex flex-1 flex-col gap-1 text-sm font-semibold">
                    <span>
                        {t('editor.zoom')}{' '}
                        <span className="font-mono font-normal">
                            {zoomPercent}%
                        </span>
                    </span>
                    <input
                        type="range"
                        min={minPercent}
                        max={MAX_ZOOM * 100}
                        step={1}
                        value={zoomPercent}
                        disabled={context === null}
                        onChange={(event) =>
                            onAct({
                                type: 'zoom-to',
                                scale: Number(event.target.value) / 100,
                            })
                        }
                        className="h-11 accent-ink"
                    />
                </label>
                <Button
                    variant="icon"
                    aria-label={t('editor.zoom_in')}
                    disabled={context === null}
                    onClick={() =>
                        onAct(
                            { type: 'zoom-by', delta: 0.1 },
                            t('editor.zoom_announce', {
                                percent: Math.min(
                                    MAX_ZOOM * 100,
                                    zoomPercent + 10,
                                ),
                            }),
                        )
                    }
                >
                    +
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Button
                    variant="secondary"
                    disabled={context === null}
                    onClick={() => onAct({ type: 'rotate', turns: 1 })}
                >
                    <span aria-hidden="true">⟳</span>
                    {t('editor.photo_rotate')}
                </Button>
                <label className="flex min-h-11 items-center gap-2 text-base">
                    <input
                        type="checkbox"
                        className="size-5 accent-ink"
                        checked={placement.grayscale}
                        disabled={context === null}
                        onChange={(event) =>
                            onAct({
                                type: 'grayscale',
                                on: event.target.checked,
                            })
                        }
                    />
                    {t('editor.grayscale')}
                </label>
            </div>

            {dpi !== null && (
                <p className="m-0 text-sm text-ink-soft">
                    {resolutionLabel(dpi, locale)}
                </p>
            )}
            <p className="m-0 flex items-center gap-2 text-sm text-ink-soft">
                <HandIcon size={18} className="shrink-0 text-ink" />
                {t(
                    hints
                        ? 'editor.photo_hint_move'
                        : 'editor.photo_hint_touch',
                )}
            </p>
        </div>
    );
}

/** Uploads in progress, upload errors, and the message after several photos. */
function UploadStatus({ upload }: { upload: PhotoUpload }) {
    const t = useTranslation();
    const { locale } = usePage().props;

    return (
        <>
            {upload.uploads.map((item) =>
                item.kind === 'working' ? (
                    <p
                        key={`w-${item.name}`}
                        role="status"
                        className="m-0 text-sm text-ink-soft"
                    >
                        {item.name} ·{' '}
                        {item.stage === 'converting'
                            ? t('editor.photo_converting')
                            : t('editor.photo_resizing')}
                    </p>
                ) : item.kind === 'error' ? (
                    <p
                        key={`e-${item.error.fileName}`}
                        role="alert"
                        className="m-0 flex items-start gap-2 rounded-control border-2 border-press px-3 py-2 text-sm"
                    >
                        <WarningIcon size={18} className="mt-0.5 shrink-0" />
                        <span>
                            <strong>{item.error.fileName}</strong>{' '}
                            {item.error.rest[locale]}
                        </span>
                    </p>
                ) : (
                    <p
                        key={`s-${item.name}`}
                        role="alert"
                        className="m-0 rounded-control border-2 border-press px-3 py-2 text-sm"
                    >
                        <strong>{item.name}</strong>{' '}
                        {t('editor.photo_storage_full')}
                    </p>
                ),
            )}
            {upload.placed?.kind === 'message' && (
                <p role="status" className="m-0 text-sm">
                    {upload.placed.text}
                </p>
            )}
        </>
    );
}

/**
 * The list after a choice of several photos (ronde 3, UX 1): which photo went on which element, with one step back.
 * It stays in the panel until the next choice or until it is closed, so you can check the elements first.
 */
export function PlacedList({
    placed,
    onUndo,
    onClose,
}: {
    placed: Extract<Placed, { kind: 'batch' }>;
    onUndo: () => void;
    onClose: () => void;
}) {
    const t = useTranslation();

    return (
        <div
            role="status"
            className="flex flex-col gap-2 rounded-control border-2 border-ink bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)]"
            data-testid="photos-placed"
        >
            <div className="flex items-start justify-between gap-3">
                <p className="m-0 font-display text-base font-extrabold">
                    {placed.undone
                        ? t('editor.photos_undone', {
                              count: placed.items.length,
                          })
                        : t('editor.photos_placed_title', {
                              count: placed.items.length,
                          })}
                </p>
                <Button
                    variant="icon"
                    className="-mt-1 -mr-1 size-9 min-h-9"
                    aria-label={t('editor.photos_close')}
                    onClick={onClose}
                >
                    <CloseIcon size={16} />
                </Button>
            </div>
            {!placed.undone && (
                <ol className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
                    {placed.items.map((item) => (
                        <li
                            key={item.key}
                            className="flex min-w-0 items-baseline gap-2"
                        >
                            <span className="min-w-0 truncate font-mono text-xs text-ink-soft">
                                {item.file}
                            </span>
                            <span aria-hidden="true">→</span>
                            <span className="sr-only">
                                {t('editor.photos_went_to')}
                            </span>
                            <span className="min-w-0 truncate font-semibold">
                                {item.label}
                            </span>
                        </li>
                    ))}
                </ol>
            )}
            {placed.note !== '' && !placed.undone && (
                <p className="m-0 text-xs text-ink-soft">{placed.note}</p>
            )}
            {!placed.undone && (
                <div>
                    <Button variant="secondary" onClick={onUndo}>
                        {t('editor.photos_undo')}
                    </Button>
                </div>
            )}
        </div>
    );
}

type DeedChoice = 'none' | 'space' | 'photo';

/**
 * The Afbeelding section of a title deed (B157): no photo, the photo of its space (the standard when the space has
 * one), or a photo of its own. Moving the inherited photo in the preview makes it the deed's own crop.
 */
function DeedImage({
    session,
    edition,
    resolved,
    editKey,
    waiting,
    onWait,
    openFiles,
    photoPart,
    fileField,
    status,
}: {
    session: EditionSession;
    edition: Edition;
    resolved: ResolvedEdition;
    editKey: string;
    waiting: ImageChoice | null;
    onWait: (choice: ImageChoice) => void;
    openFiles: () => void;
    photoPart: ReactNode;
    fileField: ReactNode;
    status: ReactNode;
}) {
    const t = useTranslation();
    const deed = resolved.deeds?.find((candidate) => candidate.key === editKey);
    const ownSpaceKey =
        deed === undefined ? undefined : spaceKey(deed.space.position);
    const spaceOverride =
        ownSpaceKey === undefined ? undefined : edition.elements[ownSpaceKey];
    const own = edition.elements[editKey]?.photo !== undefined;
    const current: DeedChoice = own
        ? 'photo'
        : deed?.photoFrom === 'space'
          ? 'space'
          : waiting === 'photo'
            ? 'photo'
            : 'none';
    const group = `deed-photo:${editKey}`;
    const options: ChoiceOption<DeedChoice>[] = [
        { id: 'none', label: t('editor.image_none') },
        ...(spaceOverride?.photo === undefined
            ? []
            : [{ id: 'space' as const, label: t('editor.deed_photo_space') }]),
        { id: 'photo', label: t('editor.deed_photo_other') },
    ];

    const choose = (next: DeedChoice): void => {
        onWait(next === 'photo' ? 'photo' : 'none');
        if (next === 'photo') {
            if (!own) openFiles();

            return;
        }
        if (own) {
            editElement(session, editKey, { photo: undefined }, group);
        }
        if (ownSpaceKey !== undefined && spaceOverride?.photo !== undefined) {
            editElement(
                session,
                ownSpaceKey,
                { deedPhoto: next === 'none' ? false : undefined },
                group,
            );
        }
    };

    return (
        <>
            <ChoiceRow<DeedChoice>
                fields={own ? {} : { photo: 'photo' }}
                label={t('editor.section_image')}
                options={options}
                value={current}
                onChange={choose}
            />
            {fileField}
            {current === 'space' && (
                <p className="m-0 text-sm text-ink-soft">
                    {t('editor.deed_photo_space_hint')}
                </p>
            )}
            {current === 'photo' && photoPart}
            {status}
        </>
    );
}

interface CenterImageProps {
    session: EditionSession;
    edition: Edition;
    resolved: ResolvedEdition;
    editKey: string;
    override: ElementOverride | undefined;
    cache: PhotoCache;
    photoPart: ReactNode;
    fileField: ReactNode;
    status: ReactNode;
}

/**
 * The board centre (B125, §3.4): one choice for what stands in the middle (name, name with a photo, logo) and one
 * for what lies under it (board green or a photo over the whole centre).
 */
function CenterImage({
    session,
    edition,
    resolved,
    editKey,
    override,
    cache,
    photoPart,
    fileField,
    status,
}: CenterImageProps) {
    const t = useTranslation();
    const { locale } = usePage().props;
    const centre = resolved.boardCenter;
    const [under, setUnder] = useState<'green' | 'photo' | null>(null);
    const ground =
        override?.background !== undefined ? 'photo' : (under ?? 'green');

    return (
        <>
            <ChoiceRow<CenterMode>
                name={t('editor.center_mode')}
                label={t('editor.center_mode')}
                options={CENTER_MODES.map((mode) => ({
                    id: mode,
                    label: t(`editor.center_mode_${mode}`),
                }))}
                value={centre.mode}
                onChange={(mode) =>
                    editElement(session, editKey, {
                        centerMode: mode === 'name' ? undefined : mode,
                    })
                }
            />
            {fileField}
            {centre.mode !== 'name' && (
                <>
                    <p className="m-0 text-xs text-ink-soft">
                        {t(`editor.center_hint_${centre.mode}`)}
                    </p>
                    {photoPart}
                    {centre.mode === 'photo' && (
                        <label className="flex min-h-11 items-center gap-2 text-base">
                            <input
                                type="checkbox"
                                className="size-5 accent-ink"
                                checked={centre.photoFrame}
                                data-field="photo-frame"
                                onChange={(event) =>
                                    editElement(session, editKey, {
                                        photoFrame: event.target.checked
                                            ? undefined
                                            : false,
                                    })
                                }
                            />
                            {t('editor.photo_frame')}
                        </label>
                    )}
                </>
            )}
            {status}
            <ChoiceRow<'green' | 'photo'>
                name={t('editor.center_ground')}
                label={t('editor.center_ground')}
                options={[
                    { id: 'green', label: t('editor.center_ground_green') },
                    { id: 'photo', label: t('editor.center_ground_photo') },
                ]}
                value={ground}
                onChange={(next) => {
                    setUnder(next);
                    if (
                        next === 'green' &&
                        override?.background !== undefined
                    ) {
                        editElement(session, editKey, {
                            background: undefined,
                        });
                    }
                }}
            />
            {ground === 'photo' && (
                <CenterBackground
                    session={session}
                    edition={edition}
                    editKey={editKey}
                    override={override}
                    cache={cache}
                    locale={locale}
                />
            )}
        </>
    );
}
