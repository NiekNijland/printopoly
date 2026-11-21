import { usePage } from '@inertiajs/react';
import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';

import { Icon } from '@/components/render/icons';
import { Button } from '@/components/ui/button';
import { useServices } from '@/hooks/use-editions';
import { useTranslation } from '@/hooks/use-translation';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition, SpaceIcon } from '@/lib/edition/types';
import { editElement } from '@/lib/editor/edit';
import { ingestPhoto } from '@/lib/editor/ingest';
import type { PhotoCache } from '@/lib/editor/photo-cache';
import type { Space } from '@/lib/game/types';
import { defaultTransform } from '@/lib/photos/transform';
import {
    ICONS_BY_KIND,
    SPACE_ICON_NAMES,
    defaultSpaceIcon,
    iconKindOf,
    type SpaceIconPreset,
} from '@/lib/render/space-icons';
import { THEMES } from '@/lib/render/themes';
import { cn } from '@/lib/utils';

export interface SpaceIconPickerProps {
    session: EditionSession;
    edition: Edition;
    editKey: string;
    space: Space;
}

/** Accepted like any other photo; a PNG keeps its transparent parts (B125, B136). */
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

/** What a special space shows now (B136): its standard icon, another of our icons, or an own image. */
export type IconChoice = 'standard' | 'preset' | 'upload';

export function iconChoiceOf(icon: SpaceIcon | undefined): IconChoice {
    if (icon === undefined) {
        return 'standard';
    }

    return 'photo' in icon ? 'upload' : 'preset';
}

/**
 * "Ander icoon" for a special space (B136): our own icons in a grid, without the standard one, which has its own
 * choice in the Afbeelding section. Arrow keys move, Enter or Space picks.
 */
export function IconPresetGrid({
    session,
    edition,
    editKey,
    space,
}: SpaceIconPickerProps) {
    const t = useTranslation();
    const { locale } = usePage().props;
    const buttons = useRef<(HTMLButtonElement | null)[]>([]);
    const kind = iconKindOf(space);

    if (kind === null) {
        return null;
    }

    const icon = edition.elements[editKey]?.icon;
    const standard = defaultSpaceIcon(space);
    const presets = ICONS_BY_KIND[kind].filter((preset) => preset !== standard);
    const chosen: SpaceIconPreset | null =
        icon !== undefined && 'preset' in icon ? icon.preset : null;
    const color = THEMES[edition.theme].ink;
    const focusIndex = Math.max(
        0,
        chosen === null ? 0 : presets.indexOf(chosen),
    );

    const choose = (preset: SpaceIconPreset): void => {
        // A photo and an own image give way to the icon: the space shows one picture.
        editElement(session, editKey, { icon: { preset }, photo: undefined });
    };

    const onKeyDown = (
        event: KeyboardEvent<HTMLButtonElement>,
        index: number,
    ): void => {
        const columns = 4;
        const moves: Record<string, number> = {
            ArrowRight: 1,
            ArrowLeft: -1,
            ArrowDown: columns,
            ArrowUp: -columns,
        };
        let next: number | undefined;
        if (event.key in moves) {
            next = index + (moves[event.key] ?? 0);
        } else if (event.key === 'Home') {
            next = 0;
        } else if (event.key === 'End') {
            next = presets.length - 1;
        }
        if (next === undefined) {
            return;
        }
        event.preventDefault();
        const clamped = Math.min(presets.length - 1, Math.max(0, next));
        const preset = presets[clamped];
        if (preset !== undefined) {
            choose(preset);
            buttons.current[clamped]?.focus();
        }
    };

    const tile =
        'relative flex aspect-square min-h-14 w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-control border-2 bg-paper p-0 text-xs font-semibold';

    return (
        <div
            role="radiogroup"
            aria-label={t('editor.image_icon_other')}
            className="grid grid-cols-4 gap-2"
            data-field="icon"
        >
            {presets.map((preset, index) => {
                const selected = chosen === preset;
                const name = SPACE_ICON_NAMES[preset][locale];

                return (
                    <button
                        key={preset}
                        ref={(node) => {
                            buttons.current[index] = node;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={name}
                        title={name}
                        tabIndex={focusIndex === index ? 0 : -1}
                        onClick={() => choose(preset)}
                        onKeyDown={(event) => onKeyDown(event, index)}
                        className={cn(
                            tile,
                            selected
                                ? 'border-press shadow-[inset_0_0_0_1px_var(--color-press)]'
                                : 'border-line-strong hover:border-ink',
                        )}
                    >
                        <span className="relative block size-8">
                            <Icon
                                name={preset}
                                x={0}
                                y={0}
                                size={8.4}
                                color={color}
                                strokeWidth={1.6}
                            />
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

/** "Eigen afbeelding" for a special space (B136): an image of your own instead of the icon. */
export function IconUpload({
    session,
    edition,
    editKey,
    cache,
}: Omit<SpaceIconPickerProps, 'space'> & { cache: PhotoCache }) {
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
        const base = defaultTransform();
        const { width, height } = result.record;
        editElement(session, editKey, {
            photo: undefined,
            icon: {
                aspect: width > 0 && height > 0 ? width / height : 1,
                photo: {
                    photoId: result.record.id,
                    cx: base.x,
                    cy: base.y,
                    scale: base.scale,
                    rotation: base.rotation,
                    grayscale: false,
                },
            },
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
}
