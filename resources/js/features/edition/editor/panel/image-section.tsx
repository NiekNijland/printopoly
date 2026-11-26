import { usePage } from '@inertiajs/react';
import { useId, useRef, useState } from 'react';

import { WarningIcon } from '@/components/icons';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { editElement } from '@/features/edition/editor/edit';
import { CenterImage } from '@/features/edition/editor/panel/center-image';
import { DeedImage } from '@/features/edition/editor/panel/deed-image';
import {
    clearsSomething,
    type ImageChoice,
    type ImageParts,
} from '@/features/edition/editor/panel/image-choice';
import { PhotoTools } from '@/features/edition/editor/panel/photo-tools';
import {
    CardBackImage,
    PlainImage,
} from '@/features/edition/editor/panel/simple-image';
import { SpaceImage } from '@/features/edition/editor/panel/space-image';
import type { PhotoUpload } from '@/features/edition/editor/panel/use-photo-upload';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import type { ElementKind } from '@/lib/render/edition-keys';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import type { Edition, ElementOverride } from '@/lib/render/edition-types';
import { deedKeyForSpace } from '@/lib/render/editor-catalogue';
import type { PhotoCache } from '@/lib/render/editor-photo-cache';
import type {
    PlacementAction,
    PlacementContext,
} from '@/lib/render/editor-placements';
import type { Space } from '@/types/game';

export const PHOTO_ACCEPT =
    'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';

type ImageSectionProps = {
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
};

/** A short line that says where a photo goes, for elements where that is not obvious. */
const whereKey = (
    kind: ElementKind,
    space: Space | undefined,
): string | null => {
    if (kind === 'pawn') {
        return 'editor.image_where_pawn';
    }
    if (kind === 'note') {
        return 'editor.image_where_note';
    }

    return kind === 'space' &&
        (space?.type === 'station' || space?.type === 'utility')
        ? 'editor.image_where_deed'
        : null;
};

const DeedLine = ({
    session,
    edition,
    editKey,
    kind,
    override,
}: {
    session: EditionSession;
    edition: Edition;
    editKey: string;
    kind: ElementKind;
    override: ElementOverride | undefined;
}) => {
    const t = useTranslation();
    const deedId = useId();
    // A street, station or utility: its photo is on the title deed too, unless switched off (B157).
    const spacePosition =
        kind === 'space' ? Number(editKey.split('.')[1]) : undefined;
    const ownDeedKey =
        spacePosition === undefined || !edition.parts.deeds
            ? undefined
            : deedKeyForSpace(spacePosition);

    return ownDeedKey === undefined ? null : edition.elements[ownDeedKey]
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
};

/**
 * The Afbeelding section (§3.4, B141): one row with only the choices the element has, then the tools for that
 * choice. Photo tools (In kader / Hele vak, zoom, a quarter turn, black and white) come after a photo is chosen.
 */
export const ImageSection = ({
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
}: ImageSectionProps) => {
    const override: ElementOverride | undefined = edition.elements[editKey];
    const placement = override?.photo;
    const fileInput = useRef<HTMLInputElement>(null);
    // A choice that waits for its next step (a file, an icon) until the element really changes.
    const [pending, setPending] = useState<{
        key: string;
        choice: ImageChoice;
    } | null>(null);
    const hold = (choice: ImageChoice | null): void =>
        setPending(choice === null ? null : { key: editKey, choice });
    const openFiles = (): void => fileInput.current?.click();
    const photoTools = (chooseButton: boolean) => (
        <PhotoTools
            chooseButton={chooseButton}
            session={session}
            editKey={editKey}
            override={override}
            photoStyle={photoStyle}
            extra={
                <DeedLine
                    session={session}
                    edition={edition}
                    editKey={editKey}
                    kind={kind}
                    override={override}
                />
            }
            context={context}
            onAct={onAct}
            cache={cache}
            upload={upload}
            onChoose={openFiles}
            onSwapped={onAnnounce}
        />
    );
    const parts: ImageParts = {
        session,
        edition,
        editKey,
        override,
        cache,
        waiting: pending?.key === editKey ? pending.choice : null,
        wait: (choice) => hold(choice === 'photo' ? null : choice),
        hold,
        clear: (patch) => {
            if (clearsSomething(session.edition.elements[editKey], patch)) {
                editElement(session, editKey, patch);
            }
        },
        openFiles,
        // Without a photo the P shortcut and a photo warning land on the Foto choice, with one on "Andere foto".
        photoField: placement === undefined ? { photo: 'photo' } : {},
        fileField: (
            <input
                ref={fileInput}
                type="file"
                accept={PHOTO_ACCEPT}
                multiple
                hidden
                data-testid="photo-input"
                onChange={upload.choose}
            />
        ),
        photoPart: photoTools(false),
        choosePart: photoTools(true),
        status: <UploadStatus upload={upload} />,
        where: whereKey(kind, iconSpace),
    };

    if (kind === 'boardCenter') {
        return <CenterImage {...parts} photoPart={parts.choosePart} />;
    }
    if (iconSpace !== undefined) {
        return <SpaceImage {...parts} iconSpace={iconSpace} />;
    }
    if (kind === 'deed') {
        return <DeedImage {...parts} resolved={resolved} onWait={parts.wait} />;
    }
    if (kind === 'cardBack') {
        return <CardBackImage {...parts} />;
    }

    return <PlainImage {...parts} kind={kind} resolved={resolved} />;
};

/** Uploads in progress, upload errors, and the message after several photos. */
export const UploadStatus = ({ upload }: { upload: PhotoUpload }) => {
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
};
