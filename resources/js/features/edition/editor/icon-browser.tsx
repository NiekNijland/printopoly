import { usePage } from '@inertiajs/react';
import { CheckIcon, SearchIcon } from 'lucide-react';
import { useState } from 'react';

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
import { useThreeColumns, useWideScreen } from '@/hooks/use-media-query';
import { useTranslation } from '@/hooks/use-translation';
import {
    ICON_CATEGORIES,
    LUCIDE_CATALOGUE,
    SPACE_ICON_PRESETS,
    spaceIconName,
    type SpaceIconPreset,
} from '@/lib/render/space-icons';
import { cn } from '@/lib/utils';
import type { Locale } from '@/types/game';

/** The icon of a preset, drawn by the same code as on the space and in the print (B196). */
export const IconGlyph = ({
    id,
    color,
    small = false,
}: {
    id: SpaceIconPreset;
    color: string;
    small?: boolean;
}) => {
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
};

const ALL_COUNT = SPACE_ICON_PRESETS.length + LUCIDE_CATALOGUE.length;

/**
 * The whole icon set to search in (B196): shadcn's Command in a Popover beside the button, or in a Drawer from the
 * bottom on a phone. Typing filters on the Dutch and English names and on the group; the arrow keys move, Enter
 * picks and closes.
 */
export const IconBrowser = ({
    chosen,
    suggestions,
    color,
    onChoose,
}: {
    chosen: SpaceIconPreset | null;
    suggestions: readonly SpaceIconPreset[];
    color: string;
    onChoose: (preset: SpaceIconPreset) => void;
}) => {
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
};

/** Lower case without accents, so "cafe" finds "Café". */
const fold = (text: string): string => {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
};

/**
 * The search of the icon picker (B196): every word typed has to start a word of the name (Dutch or English) or of
 * the group. Names that start with the search come first. cmdk's own fuzzy match found "Raam met tralies" for
 * "trein", which is no help when you look for one drawing.
 */
const iconFilter = (
    _value: string,
    search: string,
    keywords: string[] = [],
): number => {
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
};

type IconGroup = { id: string; label: string; icons: SpaceIconPreset[] };

const iconGroups = (
    query: string,
    suggestions: readonly SpaceIconPreset[],
    t: ReturnType<typeof useTranslation>,
): IconGroup[] => [
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

const IconCommand = ({
    chosen,
    suggestions,
    color,
    onPick,
}: {
    chosen: SpaceIconPreset | null;
    suggestions: readonly SpaceIconPreset[];
    color: string;
    onPick: (preset: SpaceIconPreset) => void;
}) => {
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

    const groups = iconGroups(query, suggestions, t);

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
};
