import { usePage } from '@inertiajs/react';
import {
    useEffect,
    useId,
    useRef,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from 'react';

import { CenterBackground } from '@/components/editor/center-background';
import { PhotoSwapDialog } from '@/components/editor/panel/panel-header';
import { PhotoStyleChoice } from '@/components/editor/photo-style-choice';
import {
    IconPresetPicker,
    IconUpload,
    iconChoiceOf,
} from '@/components/editor/space-icon-picker';
import { PatternPicker } from '@/components/editor/style-controls';
import { HandIcon, SwapIcon, WarningIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { useKeyboardHints } from '@/hooks/use-media-query';
import { useTranslation } from '@/hooks/use-translation';
import type { ElementKind } from '@/lib/edition/keys';
import { parseKey, spaceKey } from '@/lib/edition/keys';
import type { ResolvedEdition } from '@/lib/edition/resolve';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition, ElementOverride } from '@/lib/edition/types';
import {
    deedKeyForSpace,
    elementLabel,
    holdsPhoto,
} from '@/lib/editor/catalogue';
import { editElement } from '@/lib/editor/edit';
import type { PhotoCache } from '@/lib/editor/photo-cache';
import { canSwapPhoto } from '@/lib/editor/photo-swap';
import {
    lidLogoPlacement,
    placementDpi,
    type PlacementAction,
    type PlacementContext,
} from '@/lib/editor/placements';
import { shortcutKeys } from '@/lib/editor/shortcuts';
import type { Space } from '@/lib/game/types';
import { placementTarget, resolutionLabel } from '@/lib/photos/resolution';
import {
    MAX_ZOOM,
    minZoom,
    seamClearX,
    startingPoint,
} from '@/lib/photos/transform';
import { centerRect } from '@/lib/print/board';
import type { Size } from '@/lib/print/types';
import { CENTER_PHOTO_BLEED } from '@/lib/render/center-layout';
import { THEMES } from '@/lib/render/themes';

import { ChoiceRow, RangeField, type ChoiceOption } from './panel-parts';
import type { PhotoUpload } from './use-photo-upload';

export const PHOTO_ACCEPT =
    'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';

/** What an element shows in its Afbeelding section (§3.4). */
type ImageChoice =
    'none' | 'photo' | 'standard' | 'preset' | 'upload' | 'pattern' | 'logo';

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
    /** Says what happened, for the status line: a photo that went to another space (B238). */
    onAnnounce?: (text: string) => void;
}

/** A short line that says where a photo goes, for elements where that is not obvious. */
function whereKey(kind: ElementKind, space: Space | undefined): string | null {
    switch (kind) {
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
    onAnnounce,
}: ImageSectionProps) {
    const t = useTranslation();
    const deedId = useId();
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
        setPending(choice === 'photo' ? null : { key: editKey, choice });
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
            <Field orientation="horizontal" className="min-h-11 gap-2">
                <Checkbox
                    id={deedId}
                    checked={override?.deedPhoto !== false}
                    data-field="deed-photo"
                    onCheckedChange={(checked) =>
                        editElement(session, editKey, {
                            deedPhoto: checked === true ? undefined : false,
                        })
                    }
                />
                <FieldLabel htmlFor={deedId} className="text-base font-normal">
                    {t('editor.deed_photo_also')}
                </FieldLabel>
            </Field>
        );

    const photoTools = (chooseButton: boolean) => (
        <PhotoTools
            chooseButton={chooseButton}
            session={session}
            editKey={editKey}
            override={override}
            photoStyle={photoStyle}
            extra={deedLine}
            context={context}
            onAct={onAct}
            cache={cache}
            upload={upload}
            onChoose={openFiles}
            onSwapped={onAnnounce}
        />
    );
    const photoPart = photoTools(false);
    const fileField = (
        <input
            ref={fileInput}
            type="file"
            accept={PHOTO_ACCEPT}
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
                photoPart={photoTools(true)}
                fileField={fileField}
                status={status}
                openFiles={openFiles}
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
            {
                id: 'standard',
                label: t('editor.image_icon_standard'),
                short: t('editor.image_icon_standard_short'),
            },
            {
                id: 'preset',
                label: t('editor.image_icon_other'),
                short: t('editor.image_icon_other_short'),
            },
            {
                id: 'upload',
                label: t('editor.image_own'),
                short: t('editor.image_own_short'),
            },
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
                    <IconPresetPicker
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

    // Everything else: no picture or a photo. The box lid shows the theme without one, and can show the logo of the
    // board centre (B241, Lukas): the same file, whole and straight above the name.
    const centerLogo =
        kind === 'boxLid' && resolved.boardCenter.mode === 'logo'
            ? resolved.boardCenter.photo
            : undefined;
    const lidLogo =
        kind === 'boxLid' &&
        placement !== undefined &&
        placement.photoId === centerLogo?.photoId;
    const current: ImageChoice = lidLogo
        ? 'logo'
        : placement !== undefined
          ? 'photo'
          : (waiting ?? 'none');
    const options: ChoiceOption<ImageChoice>[] = [
        {
            id: 'none',
            label:
                kind === 'boxLid'
                    ? t('editor.image_theme')
                    : t('editor.image_none'),
        },
        ...(centerLogo !== undefined
            ? [{ id: 'logo' as const, label: t('editor.image_lid_logo') }]
            : []),
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
                    } else if (next === 'logo') {
                        if (centerLogo !== undefined && !lidLogo) {
                            editElement(session, editKey, {
                                photo: lidLogoPlacement(centerLogo),
                                photoStyle: undefined,
                            });
                        }
                    } else if (placement === undefined || lidLogo) {
                        openFiles();
                    }
                }}
            />
            {fileField}
            {current === 'logo' ? (
                <p className="m-0 text-sm text-ink-soft" data-lid-logo>
                    {t('editor.lid_logo_hint')}
                </p>
            ) : (
                /* One place for both, so the tools stay mounted and the focus can move to Andere foto (bug 16). */
                (current === 'photo' || current === 'none') && photoPart
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
    /** A line under the photo, such as "Ook op het eigendomsbewijs" on a street (B157). */
    extra?: ReactNode;
    context: PlacementContext | null;
    onAct: (action: PlacementAction, announcement?: string) => void;
    cache: PhotoCache;
    upload: PhotoUpload;
    onChoose: () => void;
    /** After "Naar ander vak…", with the words for the status line (B238). */
    onSwapped?: (text: string) => void;
    /**
     * A "Foto kiezen" button before there is a photo. Only the board centre needs it: its layout can wait for a
     * photo. Everywhere else the choice Foto opens the files at once (vindbaarheid point 2).
     */
    chooseButton?: boolean;
}

/** Before a photo only Plakken (and "Foto kiezen" in the centre); after it the photo with "Andere foto" and its tools. */
function PhotoTools({
    session,
    editKey,
    override,
    photoStyle,
    extra,
    context,
    onAct,
    cache,
    upload,
    onChoose,
    onSwapped,
    chooseButton = false,
}: PhotoToolsProps) {
    const t = useTranslation();
    const grayscaleId = useId();
    const { locale } = usePage().props;
    const hints = useKeyboardHints();
    const photos = useSyncExternalStore(cache.subscribe, cache.getSnapshot);
    const [swapping, setSwapping] = useState(false);
    const placement = override?.photo;
    const zoomPercent = Math.round((placement?.scale ?? 1) * 100);
    // After the first photo "Foto kiezen" makes way for "Andere foto"; the focus goes with it instead of
    // falling to `body`, where single letters are shortcuts (bug 16, ronde 3).
    const box = useRef<HTMLDivElement>(null);
    const photoId = placement?.photoId;
    const hadPhoto = useRef(photoId !== undefined);
    useEffect(() => {
        if (photoId === undefined) {
            hadPhoto.current = false;

            return;
        }
        const active = document.activeElement;
        if (
            !hadPhoto.current &&
            (active === null || active === document.body || !active.isConnected)
        ) {
            box.current
                ?.querySelector<HTMLElement>('[data-field="photo"]')
                ?.focus({ preventScroll: true });
        }
        hadPhoto.current = true;
    }, [photoId]);
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
            <div ref={box} className="flex flex-col gap-2">
                {(chooseButton || paste !== false) && (
                    <div className="flex flex-wrap gap-2">
                        {chooseButton && (
                            <Button
                                data-field="photo"
                                variant="secondary"
                                onClick={onChoose}
                            >
                                {t('editor.photo_choose')}
                            </Button>
                        )}
                        {paste}
                    </div>
                )}
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
        <div ref={box} className="flex flex-col gap-4">
            <div className="rounded-control border-2 border-ink bg-paper">
                <div className="flex flex-wrap items-center gap-3 p-3">
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
                {/* The photo to another space, or two photos trading places (B238): a quiet line under the photo. */}
                {canSwapPhoto(session.edition, editKey) && (
                    <div className="border-t border-dashed border-line-strong px-3">
                        <Button
                            variant="link"
                            data-photo-swap
                            className="min-h-11 gap-2 text-base no-underline hover:underline"
                            onClick={() => setSwapping(true)}
                        >
                            <SwapIcon size={18} />
                            {t('editor.photo_swap_short')}
                        </Button>
                    </div>
                )}
            </div>
            {canSwapPhoto(session.edition, editKey) && (
                <PhotoSwapDialog
                    open={swapping}
                    onOpenChange={setSwapping}
                    session={session}
                    edition={session.edition}
                    editKey={editKey}
                    title={elementLabel(editKey, session.edition, locale)}
                    photos={photos}
                    onDone={(text) => {
                        setSwapping(false);
                        onSwapped?.(text);
                    }}
                />
            )}

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

            {/* Vullend / Passend (B168), also for a logo or photo in the board centre; the photo over the whole
                centre has its own tools. */}
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
                <RangeField
                    className="flex-1"
                    label={t('editor.zoom')}
                    shown={
                        <span className="font-mono font-normal">
                            {zoomPercent}%
                        </span>
                    }
                    min={minPercent}
                    max={MAX_ZOOM * 100}
                    value={zoomPercent}
                    valueText={`${String(zoomPercent)}%`}
                    disabled={context === null}
                    onChange={(next) =>
                        onAct({ type: 'zoom-to', scale: next / 100 })
                    }
                />
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
                <Field
                    orientation="horizontal"
                    data-disabled={context === null}
                    className="min-h-11 w-auto gap-2"
                >
                    <Checkbox
                        id={grayscaleId}
                        checked={placement.grayscale}
                        disabled={context === null}
                        onCheckedChange={(checked) =>
                            onAct({ type: 'grayscale', on: checked === true })
                        }
                    />
                    <FieldLabel
                        htmlFor={grayscaleId}
                        className="text-base font-normal"
                    >
                        {t('editor.grayscale')}
                    </FieldLabel>
                </Field>
            </div>

            {dpi !== null && (
                <p className="m-0 text-sm text-ink-soft">
                    {resolutionLabel(dpi, locale)}
                </p>
            )}
            {/* How large the photo is on paper (UX 4, ronde 4), so a face can be chosen close up. */}
            {photoStyle && context !== null && (
                <p
                    className="m-0 text-sm text-ink-soft"
                    data-testid="photo-paper-size"
                >
                    {paperSize(
                        t,
                        editKey,
                        override?.photoStyle === 'full',
                        context.frame,
                    )}
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

/** Kinds with a photo size line, and the thing the photo is printed on: "Op het deksel", not "Op het bord" (R5-08). */
const PRINTED_ON: Partial<Record<ElementKind, string>> = {
    space: 'editor.photo_on_space',
    deed: 'editor.photo_on_deed',
    card: 'editor.photo_on_card',
    note: 'editor.photo_on_note',
    pawn: 'editor.photo_on_pawn',
    boxLid: 'editor.photo_on_boxLid',
};

/** Above this many mm a face fills the photo anyway, so the line gives only the size. */
const CLOSE_UP_MM = 60;

/** How large the photo is on paper and on what (UX 4 of ronde 4, R5-08). */
function paperSize(
    t: (key: string, replacements?: Record<string, string | number>) => string,
    editKey: string,
    full: boolean,
    frame: { w: number; h: number },
): string {
    const kind = parseKey(editKey)?.kind;
    const on = kind === undefined ? undefined : PRINTED_ON[kind];
    const where = t(on ?? 'editor.photo_on_space');
    const size = { where, w: Math.round(frame.w), h: Math.round(frame.h) };

    if (Math.min(frame.w, frame.h) >= CLOSE_UP_MM) {
        return t('editor.photo_paper_size_large', size);
    }

    return t(
        full ? 'editor.photo_paper_size' : 'editor.photo_paper_size_framed',
        size,
    );
}

/** Uploads in progress, upload errors, and the message after several photos. */
export function UploadStatus({ upload }: { upload: PhotoUpload }) {
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
    openFiles: () => void;
}

/** The four layouts of the board centre (B187): one photo, which every layout with a photo takes along. */
type CenterLayoutChoice = 'name' | 'photo' | 'full' | 'logo';

const CENTER_LAYOUTS: readonly CenterLayoutChoice[] = [
    'name',
    'photo',
    'full',
    'logo',
];

/** The layout a centre shows now. A photo over the whole centre is "full", whatever the mode says. */
export function centerLayoutOf(
    override: ElementOverride | undefined,
): CenterLayoutChoice {
    if (override?.centerMode === 'logo') {
        return 'logo';
    }
    if (override?.background !== undefined) {
        return 'full';
    }

    return override?.centerMode === 'photo' ? 'photo' : 'name';
}

/**
 * The fields that switch the centre to another layout, keeping its one photo (B187, Sophie in ronde 4). The photo
 * moves between "above the name" (`photo`) and "over the whole centre" (`background`); with only the name it waits
 * in `photo`, so the next layout with a photo shows it again. `null` when the layout needs a photo first.
 */
function switchCenterLayout(
    override: ElementOverride | undefined,
    next: CenterLayoutChoice,
    aspectOf: (photoId: string) => number | undefined,
    /** The centre with the bleed of its photo, in mm: where a photo over the whole centre starts (R5-03). */
    centre?: Size,
): Partial<ElementOverride> | null {
    const current = override?.background ?? override?.photo;
    const withAspect = (photoId: string) => {
        const aspect = aspectOf(photoId);

        return aspect === undefined ? {} : { photoAspect: aspect };
    };

    if (next === 'name') {
        return {
            centerMode: undefined,
            background: undefined,
            ...(current === undefined ? {} : { photo: current }),
        };
    }
    if (current === undefined) {
        return null;
    }
    if (next === 'full') {
        const { fit: _fit, ...rest } = current;
        // The crop of the small square means nothing over the whole centre: the photo starts there as a new one
        // does, with the faces a third from the top and clear of the fold (R5-03).
        const aspect = aspectOf(current.photoId);
        const start =
            aspect === undefined
                ? undefined
                : startingPoint({ w: aspect, h: 1 }, centre);
        // Across, the middle of the photo keeps off the vertical fold where the photo is wide enough (B261).
        const across =
            aspect === undefined || centre === undefined
                ? undefined
                : seamClearX({ w: aspect, h: 1 }, centre);

        return {
            centerMode: undefined,
            photo: undefined,
            background:
                start === undefined || override?.background !== undefined
                    ? rest
                    : {
                          ...rest,
                          cx: across ?? start.x,
                          cy: start.y,
                          scale: 1,
                      },
        };
    }

    return {
        centerMode: next,
        background: undefined,
        // A logo fits whole by default (Passend, B168, B180); a photo keeps how it was placed.
        photo: next === 'logo' ? { ...current, fit: true } : current,
        ...withAspect(current.photoId),
    };
}

/**
 * The board centre (B125, B187): one choice of layout (name, name with a photo, a photo over the whole centre, or a
 * logo) and one photo. Switching the layout takes the photo along, so it never has to be chosen twice.
 */
function CenterImage({
    session,
    edition,
    editKey,
    override,
    cache,
    photoPart,
    fileField,
    status,
    openFiles,
}: CenterImageProps) {
    const t = useTranslation();
    const frameId = useId();
    const { locale } = usePage().props;
    const [waiting, setWaiting] = useState<CenterLayoutChoice | null>(null);
    const backgroundInput = useRef<HTMLInputElement>(null);
    const stored = centerLayoutOf(override);
    // A layout that waits for its photo shows as chosen until the file comes, or the layout changes.
    const layout =
        waiting !== null && stored === 'name' && override?.photo === undefined
            ? waiting
            : stored;
    // An edition from before B187 can have both photos; the one this layout does not show can go.
    const second =
        override?.background !== undefined &&
        override.photo !== undefined &&
        override.centerMode !== undefined;

    const choose = (next: CenterLayoutChoice): void => {
        setWaiting(next);
        const centre = centerRect(edition.boardProfile);
        const patch = switchCenterLayout(
            override,
            next,
            (photoId) => {
                const info = cache.getSnapshot().get(photoId);

                return info === undefined || info.height <= 0
                    ? undefined
                    : info.width / info.height;
            },
            placementTarget(centre, CENTER_PHOTO_BLEED),
        );
        if (patch !== null) {
            editElement(session, editKey, patch);

            return;
        }
        // No photo yet: straight to the files, like "Foto" on a space (UX 1, B179).
        if (next === 'full') {
            backgroundInput.current?.click();
        } else {
            editElement(session, editKey, { centerMode: next });
            openFiles();
        }
    };

    return (
        <>
            <ChoiceRow<CenterLayoutChoice>
                name={t('editor.center_mode')}
                label={t('editor.center_mode')}
                fields={override?.photo === undefined ? { photo: 'photo' } : {}}
                options={CENTER_LAYOUTS.map((mode) => ({
                    id: mode,
                    label: t(`editor.center_mode_${mode}`),
                }))}
                value={layout}
                onChange={choose}
            />
            {fileField}
            {(layout === 'photo' || layout === 'logo') && (
                <>
                    <p className="m-0 text-xs text-ink-soft">
                        {t(`editor.center_hint_${layout}`)}
                    </p>
                    {photoPart}
                    {layout === 'photo' && (
                        <Field
                            orientation="horizontal"
                            className="min-h-11 gap-2"
                        >
                            <Checkbox
                                id={frameId}
                                checked={override?.photoFrame !== false}
                                data-field="photo-frame"
                                onCheckedChange={(checked) =>
                                    editElement(session, editKey, {
                                        photoFrame:
                                            checked === true
                                                ? undefined
                                                : false,
                                    })
                                }
                            />
                            <FieldLabel
                                htmlFor={frameId}
                                className="text-base font-normal"
                            >
                                {t('editor.photo_frame')}
                            </FieldLabel>
                        </Field>
                    )}
                </>
            )}
            {/* Mounted for every layout, so choosing "Foto over het hele midden" opens its files at once. */}
            <CenterBackground
                session={session}
                edition={edition}
                editKey={editKey}
                override={override}
                cache={cache}
                locale={locale}
                inputRef={backgroundInput}
                fieldOnly={layout !== 'full'}
            />
            {second && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border-2 border-dashed border-line-strong px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                        {t('editor.center_second_photo')}
                    </span>
                    <button
                        type="button"
                        className="min-h-11 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold underline underline-offset-4"
                        onClick={() =>
                            editElement(
                                session,
                                editKey,
                                layout === 'full'
                                    ? {
                                          photo: undefined,
                                          centerMode: undefined,
                                      }
                                    : { background: undefined },
                            )
                        }
                    >
                        {t('editor.center_second_remove')}
                    </button>
                </div>
            )}
            {status}
        </>
    );
}
