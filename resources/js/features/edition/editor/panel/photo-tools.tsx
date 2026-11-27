import { usePage } from '@inertiajs/react';
import {
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from 'react';

import { HandIcon, SwapIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { editElement } from '@/features/edition/editor/edit';
import {
    PhotoFit,
    PhotoTurn,
    PhotoZoom,
} from '@/features/edition/editor/panel/photo-adjust';
import { paperSize } from '@/features/edition/editor/panel/photo-paper-size';
import { PhotoSwapDialog } from '@/features/edition/editor/panel/swap-dialogs';
import type { PhotoUpload } from '@/features/edition/editor/panel/use-photo-upload';
import { PhotoStyleChoice } from '@/features/edition/editor/photo-style-choice';
import { shortcutKeys } from '@/features/edition/editor/shortcuts';
import type { EditionSession } from '@/features/edition/session';
import { useKeyboardHints } from '@/hooks/use-media-query';
import { useTranslation } from '@/hooks/use-translation';
import { parseKey } from '@/lib/render/edition-keys';
import type {
    ElementOverride,
    PhotoPlacement,
} from '@/lib/render/edition-types';
import { elementLabel } from '@/lib/render/editor-catalogue';
import type { PhotoCache } from '@/lib/render/editor-photo-cache';
import { canSwapPhoto } from '@/lib/render/editor-photo-swap';
import {
    placementQuality,
    type PlacementAction,
    type PlacementContext,
} from '@/lib/render/editor-placements';
import { resolutionLabel } from '@/lib/render/photos-resolution';

type PhotoToolsProps = {
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
};

// After the first photo "Foto kiezen" makes way for "Andere foto"; the focus goes with it instead of
// falling to `body`, where single letters are shortcuts (bug 16, ronde 3).
const useFirstPhotoFocus = (photoId: string | undefined) => {
    const box = useRef<HTMLDivElement>(null);
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

    return box;
};

type PhotoCardProps = {
    session: EditionSession;
    editKey: string;
    placement: PhotoPlacement;
    cache: PhotoCache;
    paste: ReactNode;
    onChoose: () => void;
    onSwapped?: (text: string) => void;
};

const PhotoCard = ({
    session,
    editKey,
    placement,
    cache,
    paste,
    onChoose,
    onSwapped,
}: PhotoCardProps) => {
    const t = useTranslation();
    const { locale } = usePage().props;
    const photos = useSyncExternalStore(cache.subscribe, cache.getSnapshot);
    const [swapping, setSwapping] = useState(false);
    const thumb = photos.get(placement.photoId)?.url;

    return (
        <>
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
        </>
    );
};

type PhotoLinesProps = {
    editKey: string;
    override: ElementOverride | undefined;
    placement: PhotoPlacement;
    photoStyle: boolean;
    context: PlacementContext | null;
};

const PhotoLines = ({
    editKey,
    override,
    placement,
    photoStyle,
    context,
}: PhotoLinesProps) => {
    const t = useTranslation();
    const { locale } = usePage().props;
    const hints = useKeyboardHints();
    const quality =
        context !== null ? placementQuality(placement, context) : null;

    return (
        <>
            {quality !== null && (
                <p
                    className="m-0 text-sm text-ink-soft"
                    data-testid="photo-resolution"
                >
                    {resolutionLabel(quality, locale)}
                </p>
            )}
            {/* How large the photo is on paper (UX 4, ronde 4), with its ppi there (B251): both from the target it
                prints on, so Hele vak gives the size of the whole space. */}
            {photoStyle && quality !== null && context !== null && (
                <p
                    className="m-0 text-sm text-ink-soft"
                    data-testid="photo-paper-size"
                >
                    {paperSize(
                        t,
                        editKey,
                        override?.photoStyle === 'full',
                        context.frame,
                        quality.dpi,
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
        </>
    );
};

const NoPhotoYet = ({
    chooseButton,
    paste,
    onChoose,
}: {
    chooseButton: boolean;
    paste: ReactNode;
    onChoose: () => void;
}) => {
    const t = useTranslation();
    const hints = useKeyboardHints();

    return (
        <>
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
        </>
    );
};

/** Before a photo only Plakken (and "Foto kiezen" in the centre); after it the photo with "Andere foto" and its tools. */
export const PhotoTools = ({
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
}: PhotoToolsProps) => {
    const t = useTranslation();
    const placement = override?.photo;
    const box = useFirstPhotoFocus(placement?.photoId);
    const paste = upload.canPasteButton && (
        <Button variant="secondary" onClick={() => void upload.paste()}>
            {t('editor.photo_paste')}
        </Button>
    );

    if (placement === undefined) {
        return (
            <div ref={box} className="flex flex-col gap-2">
                <NoPhotoYet
                    chooseButton={chooseButton}
                    paste={paste}
                    onChoose={onChoose}
                />
            </div>
        );
    }

    return (
        <div ref={box} className="flex flex-col gap-4">
            <PhotoCard
                session={session}
                editKey={editKey}
                placement={placement}
                cache={cache}
                paste={paste}
                onChoose={onChoose}
                onSwapped={onSwapped}
            />

            {extra}

            {photoStyle && (
                <PhotoStyleChoice
                    kind={parseKey(editKey)?.kind}
                    value={override?.photoStyle ?? 'framed'}
                    onChange={(style) =>
                        editElement(session, editKey, {
                            photoStyle: style === 'full' ? 'full' : undefined,
                        })
                    }
                />
            )}

            <PhotoFit placement={placement} context={context} onAct={onAct} />

            <PhotoZoom placement={placement} context={context} onAct={onAct} />

            <PhotoTurn placement={placement} context={context} onAct={onAct} />

            <PhotoLines
                editKey={editKey}
                override={override}
                placement={placement}
                photoStyle={photoStyle}
                context={context}
            />
        </div>
    );
};
