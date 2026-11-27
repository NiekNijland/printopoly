import { editElement } from '@/features/edition/editor/edit';
import type {
    ImageChoice,
    ImageParts,
} from '@/features/edition/editor/panel/image-choice';
import {
    ChoiceRow,
    type ChoiceOption,
} from '@/features/edition/editor/panel/panel-parts';
import {
    IconPresetPicker,
    IconUpload,
    iconChoiceOf,
} from '@/features/edition/editor/space-icon-picker';
import { useTranslation } from '@/hooks/use-translation';
import type {
    ElementOverride,
    PhotoPlacement,
} from '@/lib/render/edition-types';
import { holdsPhoto } from '@/lib/render/editor-catalogue';
import type { PhotoCache } from '@/lib/render/editor-photo-cache';
import { defaultTransform } from '@/lib/render/photos-transform';
import type { Space } from '@/types/game';

type SpaceImageProps = ImageParts & { iconSpace: Space };

type PhotoSize = 'fill' | 'small';

// One Foto choice (Niek, 22 nov): a photo fills the space, or sits small and whole where the icon is. The
// small one is the image of your own that was a choice of its own before (B136).
const spaceImageChoice = (
    override: ElementOverride | undefined,
    waiting: ImageChoice | null,
    canPhoto: boolean,
): { current: ImageChoice; size: PhotoSize; small: boolean } => {
    const placement = override?.photo;
    const small = iconChoiceOf(override?.icon) === 'upload';
    const current: ImageChoice =
        placement !== undefined ||
        small ||
        waiting === 'photo' ||
        waiting === 'upload'
            ? 'photo'
            : iconChoiceOf(override?.icon) === 'standard'
              ? (waiting ?? 'standard')
              : iconChoiceOf(override?.icon);
    const size: PhotoSize =
        placement !== undefined
            ? 'fill'
            : small || !canPhoto || waiting === 'upload'
              ? 'small'
              : 'fill';

    return { current, size, small };
};

const smallIconPatch = (
    placement: PhotoPlacement,
    cache: PhotoCache,
): Partial<ElementOverride> => {
    const info = cache.getSnapshot().get(placement.photoId);
    const base = defaultTransform();

    return {
        photo: undefined,
        icon: {
            aspect:
                info !== undefined && info.width > 0 && info.height > 0
                    ? info.width / info.height
                    : 1,
            photo: {
                ...placement,
                cx: base.x,
                cy: base.y,
                scale: base.scale,
            },
        },
    };
};

const SpacePhotoTools = ({
    session,
    edition,
    editKey,
    override,
    cache,
    photoPart,
    choosePart,
    current,
    size,
    iconSpace,
    canPhoto,
    onResize,
}: SpaceImageProps & {
    current: ImageChoice;
    size: PhotoSize;
    canPhoto: boolean;
    onResize: (next: PhotoSize) => void;
}) => {
    const t = useTranslation();

    return (
        <>
            {current === 'photo' && canPhoto && (
                <ChoiceRow<PhotoSize>
                    name={t('editor.image_photo_size')}
                    label={t('editor.image_photo_size')}
                    options={[
                        { id: 'fill', label: t('editor.image_photo_fill') },
                        { id: 'small', label: t('editor.image_photo_small') },
                    ]}
                    value={size}
                    onChange={onResize}
                />
            )}
            {current === 'preset' && (
                <IconPresetPicker
                    session={session}
                    edition={edition}
                    editKey={editKey}
                    space={iconSpace}
                />
            )}
            {current === 'photo' && size === 'small' && (
                <IconUpload
                    session={session}
                    edition={edition}
                    editKey={editKey}
                    cache={cache}
                />
            )}
            {current === 'photo' &&
                size === 'fill' &&
                // Before the file is chosen (or after the picker was closed) the choose button stays at hand.
                (override?.photo === undefined ? choosePart : photoPart)}
        </>
    );
};

const spaceOptions = (
    t: ReturnType<typeof useTranslation>,
): ChoiceOption<ImageChoice>[] => [
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
    { id: 'photo', label: t('editor.image_photo') },
];

export const SpaceImage = (props: SpaceImageProps) => {
    const { session, editKey, override, cache, wait, hold, clear } = props;
    const { openFiles, photoField, fileField, status, where } = props;
    const t = useTranslation();
    const placement = override?.photo;
    const canPhoto = holdsPhoto(editKey);
    const { current, size, small } = spaceImageChoice(
        override,
        props.waiting,
        canPhoto,
    );
    /** The same photo, moved between the whole space and the spot of the icon. */
    const resize = (next: PhotoSize): void => {
        const icon = override?.icon;
        if (next === 'small') {
            hold('upload');
            if (placement !== undefined) {
                editElement(session, editKey, smallIconPatch(placement, cache));
            }
        } else {
            hold(null);
            if (icon !== undefined && 'photo' in icon) {
                editElement(session, editKey, {
                    icon: undefined,
                    photo: icon.photo,
                });
            } else {
                openFiles();
            }
        }
    };
    const choose = (next: ImageChoice): void => {
        if (next === 'standard') {
            wait(next);
            clear({ icon: undefined, photo: undefined });
        } else if (next === 'photo') {
            hold(canPhoto ? 'photo' : 'upload');
            if (canPhoto && placement === undefined && !small) {
                openFiles();
            }
        } else if (next === 'preset') {
            wait(next);
            clear({ photo: undefined });
        }
    };

    return (
        <>
            <ChoiceRow
                fields={photoField}
                label={t('editor.section_image')}
                options={spaceOptions(t)}
                value={current}
                onChange={choose}
            />
            {canPhoto && fileField}
            <SpacePhotoTools
                {...props}
                current={current}
                size={size}
                canPhoto={canPhoto}
                onResize={resize}
            />
            {where !== null && current !== 'photo' && (
                <p className="m-0 text-xs text-ink-soft">{t(where)}</p>
            )}
            {status}
        </>
    );
};
