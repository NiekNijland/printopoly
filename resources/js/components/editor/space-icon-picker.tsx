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
    cache: PhotoCache;
}

/** Accepted like any other photo; a PNG keeps its transparent parts (B125, B136). */
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

/**
 * "Afbeelding" for a special space (B136): a grid of our own icons (arrow keys move, Enter or Space picks), an
 * upload of an own image, and a way back to the standard icon.
 */
export function SpaceIconPicker({
    session,
    edition,
    editKey,
    space,
    cache,
}: SpaceIconPickerProps) {
    const t = useTranslation();
    const { locale } = usePage().props;
    const { repository } = useServices();
    const fileInput = useRef<HTMLInputElement>(null);
    const buttons = useRef<(HTMLButtonElement | null)[]>([]);
    const [working, setWorking] = useState(false);
    const [failed, setFailed] = useState(false);
    const kind = iconKindOf(space);

    if (kind === null) {
        return null;
    }

    const icon: SpaceIcon | undefined = edition.elements[editKey]?.icon;
    const standard = defaultSpaceIcon(space);
    const presets = ICONS_BY_KIND[kind];
    const chosen: SpaceIconPreset | null =
        icon === undefined ? standard : 'preset' in icon ? icon.preset : null;
    const uploaded = icon !== undefined && 'photo' in icon;
    const color = THEMES[edition.theme].ink;
    const focusIndex = Math.max(
        0,
        chosen === null ? 0 : presets.indexOf(chosen),
    );

    const choose = (preset: SpaceIconPreset): void => {
        // The standard icon is no choice: it leaves the field empty, as for an edition without one.
        editElement(session, editKey, {
            icon: preset === standard ? undefined : { preset },
        });
    };

    const onKeyDown = (
        event: KeyboardEvent<HTMLButtonElement>,
        index: number,
    ): void => {
        const columns = 3;
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
            <span className="text-sm font-semibold" id={`${editKey}-icon`}>
                {t('editor.icon')}
            </span>
            <div
                role="radiogroup"
                aria-labelledby={`${editKey}-icon`}
                className="grid grid-cols-3 gap-2"
            >
                {presets.map((preset, index) => {
                    const selected = !uploaded && chosen === preset;
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
                            aria-label={
                                preset === standard
                                    ? t('editor.icon_standard_name', { name })
                                    : name
                            }
                            title={name}
                            tabIndex={
                                (uploaded ? 0 : focusIndex) === index ? 0 : -1
                            }
                            onClick={() => choose(preset)}
                            onKeyDown={(event) => onKeyDown(event, index)}
                            className={cn(
                                'relative flex aspect-square min-h-14 w-full cursor-pointer items-center justify-center rounded-control border-2 bg-paper p-0',
                                selected
                                    ? 'border-ink outline-3 outline-offset-1 outline-ink'
                                    : 'border-line-strong hover:border-ink',
                            )}
                        >
                            <span className="relative block size-9">
                                <Icon
                                    name={preset}
                                    x={0}
                                    y={0}
                                    size={9.5}
                                    color={color}
                                    strokeWidth={1.6}
                                />
                            </span>
                        </button>
                    );
                })}
            </div>
            <input
                ref={fileInput}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={onFile}
            />
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant="secondary"
                    size="compact"
                    disabled={working}
                    onClick={() => fileInput.current?.click()}
                >
                    {working
                        ? t('editor.icon_uploading')
                        : t('editor.icon_upload')}
                </Button>
                {icon !== undefined && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="compact"
                        onClick={() =>
                            editElement(session, editKey, { icon: undefined })
                        }
                    >
                        {t('editor.icon_reset')}
                    </Button>
                )}
            </div>
            <p className="text-xs text-ink-soft" aria-live="polite">
                {failed
                    ? t('editor.icon_failed')
                    : uploaded
                      ? t('editor.icon_uploaded')
                      : t('editor.icon_hint')}
            </p>
        </div>
    );
}
