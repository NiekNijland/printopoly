import { usePage } from '@inertiajs/react';
import { useRef, useState, type ChangeEvent } from 'react';

import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { editElement } from '@/features/edition/editor/edit';
import { IconBrowser, IconGlyph } from '@/features/edition/editor/icon-browser';
import { ingestPhoto } from '@/features/edition/editor/ingest';
import type { EditionSession } from '@/features/edition/session';
import { useServices } from '@/features/edition/use-editions';
import { useTranslation } from '@/hooks/use-translation';
import type { Edition, SpaceIcon } from '@/lib/render/edition-types';
import type { PhotoCache } from '@/lib/render/editor-photo-cache';
import { defaultTransform } from '@/lib/render/photos-transform';
import {
    ICONS_BY_KIND,
    LUCIDE_BY_KIND,
    defaultSpaceIcon,
    iconKindOf,
    isSpaceIconPreset,
    spaceIconName,
    type SpaceIconPreset,
} from '@/lib/render/space-icons';
import { THEMES } from '@/lib/render/themes';
import type { Space } from '@/types/game';

export type SpaceIconPickerProps = {
    session: EditionSession;
    edition: Edition;
    editKey: string;
    space: Space;
};

/** Accepted like any other photo; a PNG keeps its transparent parts (B125, B136). */
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

/** What a special space shows now (B136): its standard icon, another of our icons, or an own image. */
export type IconChoice = 'standard' | 'preset' | 'upload';

export const iconChoiceOf = (icon: SpaceIcon | undefined): IconChoice => {
    if (icon === undefined) {
        return 'standard';
    }

    return 'photo' in icon ? 'upload' : 'preset';
};

/** The icons that suit a kind of space: our own first (without the standard one), then lucide (B196). */
const suggestionsFor = (space: Space): SpaceIconPreset[] => {
    const kind = iconKindOf(space);
    if (kind === null) {
        return [];
    }
    const standard = defaultSpaceIcon(space);

    return [
        ...ICONS_BY_KIND[kind].filter((preset) => preset !== standard),
        ...LUCIDE_BY_KIND[kind],
    ];
};

/** How many icons the quick choice under "Icoon" shows: two rows of four. */
const QUICK_COUNT = 8;

/**
 * "Ander icoon" for a special space (B136, B196): a quick choice of eight icons that suit the space, as shadcn's
 * ToggleGroup, and a button that opens the whole set to search in. The arrow keys move through the quick choice,
 * Space or Enter picks.
 */
export const IconPresetPicker = ({
    session,
    edition,
    editKey,
    space,
}: SpaceIconPickerProps) => {
    const t = useTranslation();
    const { locale } = usePage().props;

    if (iconKindOf(space) === null) {
        return null;
    }

    const icon = edition.elements[editKey]?.icon;
    const chosen: SpaceIconPreset | null =
        icon !== undefined && 'preset' in icon ? icon.preset : null;
    const color = THEMES[edition.theme].ink;
    const suggestions = suggestionsFor(space);
    const quick =
        chosen !== null && !suggestions.slice(0, QUICK_COUNT).includes(chosen)
            ? [chosen, ...suggestions.slice(0, QUICK_COUNT - 1)]
            : suggestions.slice(0, QUICK_COUNT);

    const choose = (preset: SpaceIconPreset): void => {
        // A photo and an own image give way to the icon: the space shows one picture.
        editElement(session, editKey, { icon: { preset }, photo: undefined });
    };

    return (
        <div className="flex flex-col gap-3" data-field="icon">
            <ToggleGroup
                type="single"
                variant="outline"
                size="lg"
                spacing={2}
                value={chosen ?? ''}
                onValueChange={(next) => {
                    if (isSpaceIconPreset(next)) {
                        choose(next);
                    }
                }}
                aria-label={t('editor.image_icon_other')}
                className="grid w-full grid-cols-4"
            >
                {quick.map((preset) => {
                    const name = spaceIconName(preset, locale);

                    return (
                        <ToggleGroupItem
                            key={preset}
                            value={preset}
                            aria-label={name}
                            title={name}
                            className="w-full bg-paper px-0"
                        >
                            <IconGlyph id={preset} color={color} />
                        </ToggleGroupItem>
                    );
                })}
            </ToggleGroup>
            <IconBrowser
                chosen={chosen}
                suggestions={suggestions}
                color={color}
                onChoose={choose}
            />
        </div>
    );
};

const uploadedIcon = ({
    id,
    width,
    height,
}: {
    id: string;
    width: number;
    height: number;
}): SpaceIcon => {
    const base = defaultTransform();

    return {
        aspect: width > 0 && height > 0 ? width / height : 1,
        photo: {
            photoId: id,
            cx: base.x,
            cy: base.y,
            scale: base.scale,
            rotation: base.rotation,
            grayscale: false,
        },
    };
};

/** "Eigen afbeelding" for a special space (B136): an image of your own instead of the icon. */
export const IconUpload = ({
    session,
    edition,
    editKey,
    cache,
}: Omit<SpaceIconPickerProps, 'space'> & { cache: PhotoCache }) => {
    const t = useTranslation();
    const { repository } = useServices();
    const fileInput = useRef<HTMLInputElement>(null);
    const [working, setWorking] = useState(false);
    const [failed, setFailed] = useState(false);
    const icon = edition.elements[editKey]?.icon;
    const uploaded = icon !== undefined && 'photo' in icon;

    const upload = async (file: File): Promise<void> => {
        setWorking(true);
        setFailed(false);
        const result = await ingestPhoto(file, repository, edition.id);
        setWorking(false);
        if (!result.ok) {
            setFailed(true);
            return;
        }
        cache.add(result.record);
        editElement(session, editKey, {
            photo: undefined,
            icon: uploadedIcon(result.record),
        });
    };

    const onFile = (event: ChangeEvent<HTMLInputElement>): void => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file !== undefined) {
            void upload(file);
        }
    };

    return (
        <div className="flex flex-col gap-2" data-field="icon">
            <Button
                variant="secondary"
                className="self-start"
                disabled={working}
                onClick={() => fileInput.current?.click()}
            >
                {working
                    ? t('editor.icon_uploading')
                    : uploaded
                      ? t('editor.icon_replace')
                      : t('editor.icon_upload_choose')}
            </Button>
            <input
                ref={fileInput}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                data-testid="icon-input"
                onChange={onFile}
            />
            <p className="m-0 text-xs text-ink-soft" aria-live="polite">
                {failed
                    ? t('editor.icon_failed')
                    : uploaded
                      ? t('editor.icon_uploaded')
                      : t('editor.icon_hint')}
            </p>
        </div>
    );
};
