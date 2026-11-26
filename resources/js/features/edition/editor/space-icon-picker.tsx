import { usePage } from '@inertiajs/react';
import { CheckIcon, SearchIcon } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';

import { SpaceIconArt } from '@/components/render/space-icon';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { editElement } from '@/features/edition/editor/edit';
import { ingestPhoto } from '@/features/edition/editor/ingest';
import type { EditionSession } from '@/features/edition/session';
import { useServices } from '@/features/edition/use-editions';
import { useThreeColumns, useWideScreen } from '@/hooks/use-media-query';
import { useTranslation } from '@/hooks/use-translation';
import type { Edition, SpaceIcon } from '@/lib/render/edition-types';
import type { PhotoCache } from '@/lib/render/editor-photo-cache';
import { defaultTransform } from '@/lib/render/photos-transform';
import {
    ICON_CATEGORIES,
    ICONS_BY_KIND,
    LUCIDE_BY_KIND,
    LUCIDE_CATALOGUE,
    SPACE_ICON_PRESETS,
    defaultSpaceIcon,
    iconKindOf,
    isSpaceIconPreset,
    spaceIconName,
    type SpaceIconPreset,
} from '@/lib/render/space-icons';
import { THEMES } from '@/lib/render/themes';
import { cn } from '@/lib/utils';
import type { Locale, Space } from '@/types/game';

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

/** The icon of a preset, drawn by the same code as on the space and in the print (B196). */
function IconGlyph({
    id,
    color,
    small = false,
}: {
    id: SpaceIconPreset;
    color: string;
    small?: boolean;
}) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'relative block shrink-0',
                small ? 'size-6' : 'size-8',
            )}
        >
            <SpaceIconArt
                icon={{ preset: id }}
                fallback={null}
                x={0}
                y={0}
                size={small ? 6.35 : 8.4}
                color={color}
                strokeWidth={1.6}
            />
        </span>
    );
}

/** The icons that suit a kind of space: our own first (without the standard one), then lucide (B196). */
function suggestionsFor(space: Space): SpaceIconPreset[] {
    const kind = iconKindOf(space);
    if (kind === null) {
        return [];
    }
    const standard = defaultSpaceIcon(space);

    return [
        ...ICONS_BY_KIND[kind].filter((preset) => preset !== standard),
        ...LUCIDE_BY_KIND[kind],
    ];
}

/** How many icons the quick choice under "Icoon" shows: two rows of four. */
const QUICK_COUNT = 8;

/**
 * "Ander icoon" for a special space (B136, B196): a quick choice of eight icons that suit the space, as shadcn's
 * ToggleGroup, and a button that opens the whole set to search in. The arrow keys move through the quick choice,
 * Space or Enter picks.
 */
export function IconPresetPicker({
    session,
    edition,
    editKey,
    space,
}: SpaceIconPickerProps) {
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
}

const ALL_COUNT = SPACE_ICON_PRESETS.length + LUCIDE_CATALOGUE.length;

/**
 * The whole icon set to search in (B196): shadcn's Command in a Popover beside the button, or in a Drawer from the
 * bottom on a phone. Typing filters on the Dutch and English names and on the group; the arrow keys move, Enter
 * picks and closes.
 */
function IconBrowser({
    chosen,
    suggestions,
    color,
    onChoose,
}: {
    chosen: SpaceIconPreset | null;
    suggestions: readonly SpaceIconPreset[];
    color: string;
    onChoose: (preset: SpaceIconPreset) => void;
}) {
    const t = useTranslation();
    const wide = useWideScreen();
    // Beside the panel only with the preview in between; on a tablet there is no room left of the panel (768 px).
    const beside = useThreeColumns();
    const [open, setOpen] = useState(false);

    const pick = (preset: SpaceIconPreset): void => {
        onChoose(preset);
        setOpen(false);
    };

    const trigger = (
        <Button variant="secondary" className="w-full" data-icon-browse>
            <SearchIcon aria-hidden="true" className="size-5" />
            {t('editor.icon_browse', { count: ALL_COUNT })}
        </Button>
    );
    const list = (
        <IconCommand
            chosen={chosen}
            suggestions={suggestions}
            color={color}
            onPick={pick}
        />
    );

    if (wide) {
        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>{trigger}</PopoverTrigger>
                <PopoverContent
                    side={beside ? 'left' : 'top'}
                    align={beside ? 'start' : 'end'}
                    sideOffset={beside ? 12 : 8}
                    collisionPadding={16}
                    aria-label={t('editor.icon_picker_title')}
                    className="w-[min(360px,calc(100vw-32px))] p-0"
                >
                    {list}
                </PopoverContent>
            </Popover>
        );
    }

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>{trigger}</DrawerTrigger>
            <DrawerContent>
                <DrawerHeader className="text-left">
                    <DrawerTitle>{t('editor.icon_picker_title')}</DrawerTitle>
                    <DrawerDescription>
                        {t('editor.icon_picker_description')}
                    </DrawerDescription>
                </DrawerHeader>
                {list}
            </DrawerContent>
        </Drawer>
    );
}

/** Lower case without accents, so "cafe" finds "Café". */
function fold(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

/**
 * The search of the icon picker (B196): every word typed has to start a word of the name (Dutch or English) or of
 * the group. Names that start with the search come first. cmdk's own fuzzy match found "Raam met tralies" for
 * "trein", which is no help when you look for one drawing.
 */
function iconFilter(
    _value: string,
    search: string,
    keywords: string[] = [],
): number {
    const terms = fold(search)
        .split(/\s+/)
        .filter((term) => term !== '');
    if (terms.length === 0) {
        return 1;
    }
    const [name = '', ...rest] = keywords.map(fold);
    const words = [name, ...rest].flatMap((text) => text.split(/[\s,-]+/));
    if (!terms.every((term) => words.some((word) => word.startsWith(term)))) {
        return 0;
    }

    return name.startsWith(terms.join(' ')) ? 1 : 0.5;
}

function IconCommand({
    chosen,
    suggestions,
    color,
    onPick,
}: {
    chosen: SpaceIconPreset | null;
    suggestions: readonly SpaceIconPreset[];
    color: string;
    onPick: (preset: SpaceIconPreset) => void;
}) {
    const t = useTranslation();
    const { locale } = usePage().props;
    const [query, setQuery] = useState('');
    const other: Locale = locale === 'nl' ? 'en' : 'nl';

    const item = (group: string, label: string, preset: SpaceIconPreset) => {
        const name = spaceIconName(preset, locale);

        return (
            <CommandItem
                key={`${group}:${preset}`}
                value={`${group}:${preset}`}
                keywords={[name, spaceIconName(preset, other), label]}
                onSelect={() => onPick(preset)}
                data-icon-option={preset}
                data-checked={chosen === preset}
            >
                <IconGlyph id={preset} color={color} small />
                <span className="flex-1 truncate">{name}</span>
                {chosen === preset && (
                    <CheckIcon aria-hidden="true" className="text-press" />
                )}
            </CommandItem>
        );
    };

    const groups: { id: string; label: string; icons: SpaceIconPreset[] }[] = [
        ...(query === ''
            ? [
                  {
                      id: 'space',
                      label: t('editor.icon_group_space'),
                      icons: [...suggestions],
                  },
              ]
            : []),
        {
            id: 'own',
            label: t('editor.icon_group_own'),
            icons: [...SPACE_ICON_PRESETS],
        },
        ...ICON_CATEGORIES.map((category) => ({
            id: category,
            label: t(`editor.icon_category_${category}`),
            icons: LUCIDE_CATALOGUE.filter((entry) =>
                entry.categories.includes(category),
            ).map((entry) => entry.id),
        })),
    ];

    return (
        <Command
            loop
            filter={iconFilter}
            label={t('editor.icon_picker_title')}
            className="rounded-none bg-transparent"
        >
            <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder={t('editor.icon_search')}
            />
            <CommandList className="max-h-[min(360px,55dvh)] px-1 pb-2">
                <CommandEmpty>{t('editor.icon_search_none')}</CommandEmpty>
                {groups.map((group) => (
                    <CommandGroup key={group.id} heading={group.label}>
                        {group.icons.map((preset) =>
                            item(group.id, group.label, preset),
                        )}
                    </CommandGroup>
                ))}
            </CommandList>
        </Command>
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
