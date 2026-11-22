import { usePage } from '@inertiajs/react';
import { useId, useState } from 'react';

import { FieldLabel } from '@/components/editor/panel/panel-parts';
import { PatternFill } from '@/components/render/pattern-fill';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTranslation } from '@/hooks/use-translation';
import { groupColor } from '@/lib/edition/group-names';
import { GROUP_IDS, groupKey } from '@/lib/edition/keys';
import type { ResolvedEdition } from '@/lib/edition/resolve';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition } from '@/lib/edition/types';
import { editElement } from '@/lib/editor/edit';
import type { GroupId } from '@/lib/game/types';
import { colorName } from '@/lib/render/color-names';
import { toPrintSafe } from '@/lib/render/gamut';
import { PALETTES, type Swatch } from '@/lib/render/palettes';
import {
    PATTERN_IDS,
    PATTERN_NAMES,
    isPatternId,
    type PatternId,
} from '@/lib/render/patterns';
import { cn } from '@/lib/utils';

const HEX = /^#[0-9a-fA-F]{6}$/;

/** The value of the tile without a pattern in the toggle group. */
const NO_PATTERN = 'none';

const capitalize = (text: string): string =>
    text.charAt(0).toUpperCase() + text.slice(1);

interface ColorFieldProps {
    /** Unique within the page, for the labels. */
    id: string;
    label: string;
    /** The colour in use. */
    value: string;
    /** `true` when the edition has its own colour here, so it can be put back. */
    custom: boolean;
    edition: Edition;
    onChange: (hex: string | undefined) => void;
    /** A group field says for how many elements it counts (B141). */
    tag?: string;
    /** Leave out the label row with its "Standaard" button, when the caller shows its own (B145). */
    hideReset?: boolean;
    /** Swatches before the palette of the theme, such as the colours the board really uses for its groups. */
    leading?: readonly Swatch[];
}

/**
 * Picks a colour: the palette of the theme, or any colour as hex or with the system picker. A
 * colour that print ink cannot reproduce is toned down at once, and the field says so (B75). The label
 * has the "Standaard" button when the edition has its own colour (B142).
 */
export function ColorField({
    id,
    label,
    value,
    custom,
    edition,
    onChange,
    tag,
    hideReset = false,
    leading = [],
}: ColorFieldProps) {
    const t = useTranslation();
    const { locale } = usePage().props;
    const [draft, setDraft] = useState<string | null>(null);
    const [softened, setSoftened] = useState(false);

    const choose = (hex: string): void => {
        const safe = toPrintSafe(hex);
        setSoftened(safe !== hex.toUpperCase());
        setDraft(null);
        onChange(safe);
    };

    return (
        <div className="flex flex-col gap-2" role="group" aria-label={label}>
            {!hideReset && (
                <FieldLabel
                    label={label}
                    tag={tag}
                    onStandard={
                        custom
                            ? () => {
                                  setSoftened(false);
                                  setDraft(null);
                                  onChange(undefined);
                              }
                            : undefined
                    }
                />
            )}
            <div
                className="grid grid-cols-6 gap-2"
                role="group"
                aria-label={t('editor.style_palette')}
            >
                {[...leading, ...PALETTES[edition.theme]]
                    .filter(
                        (swatch, index, all) =>
                            all.findIndex(
                                (other) => other.hex === swatch.hex,
                            ) === index,
                    )
                    .map((swatch) => (
                        <button
                            key={swatch.hex}
                            type="button"
                            aria-label={swatch.name[locale]}
                            aria-pressed={value.toUpperCase() === swatch.hex}
                            title={swatch.name[locale]}
                            onClick={() => choose(swatch.hex)}
                            className={cn(
                                'aspect-square min-h-9 w-full cursor-pointer rounded-control border-2 p-0',
                                value.toUpperCase() === swatch.hex
                                    ? 'border-ink shadow-[inset_0_0_0_2px_var(--color-card)] outline-3 outline-offset-1 outline-ink'
                                    : 'border-line-strong',
                            )}
                            style={{ background: swatch.hex }}
                        />
                    ))}
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    aria-label={`${label}: ${t('editor.style_picker')}`}
                    value={value.toLowerCase()}
                    onChange={(event) => choose(event.target.value)}
                    className="h-12 w-16 shrink-0 cursor-pointer rounded-control border-2 border-ink bg-card p-1"
                />
                <Input
                    id={`${id}-hex`}
                    aria-label={`${label}: hex`}
                    className="font-mono"
                    maxLength={7}
                    value={draft ?? value.toUpperCase()}
                    onBlur={() => setDraft(null)}
                    onChange={(event) => {
                        const text = `#${event.target.value
                            .replace(/[^0-9a-fA-F]/g, '')
                            .slice(0, 6)}`;
                        setDraft(text);
                        if (HEX.test(text)) {
                            choose(text);
                            setDraft(text.toUpperCase());
                        }
                    }}
                />
            </div>
            {softened && (
                <p className="m-0 text-xs text-ink-soft" role="status">
                    {t('editor.style_softened')}
                </p>
            )}
        </div>
    );
}

interface GroupColorFieldProps {
    session: EditionSession;
    edition: Edition;
    resolved: ResolvedEdition;
    group: GroupId;
    /** "Groepskleur" in the panel of a street, the name of the group in the list of all colours. */
    label: string;
    /** "geldt voor alle 3 bruine straten". */
    tag?: string;
}

/**
 * The colour of a street group (B130), the same field wherever it shows: in the panel of a street and in the
 * colours of the edition.
 */
export function GroupColorField({
    session,
    edition,
    resolved,
    group,
    label,
    tag,
}: GroupColorFieldProps) {
    // The colour the board prints the group in, also in Riso and Strak (bug 32).
    const color =
        resolved.groups.find((candidate) => candidate.id === group)?.color ??
        groupColor(edition, group);
    // First the eight colours the board of this theme uses for its groups, so a group in its own theme colour
    // shows as chosen, then the palette of the theme.
    const board: Swatch[] = GROUP_IDS.map((id) => {
        const hex = groupColor({ theme: edition.theme, elements: {} }, id);

        return {
            hex: hex.toUpperCase(),
            name: {
                nl: capitalize(colorName(hex, 'nl').name),
                en: capitalize(colorName(hex, 'en').name),
            },
        };
    });

    return (
        <ColorField
            id={`group-${group}`}
            label={label}
            tag={tag}
            value={color}
            leading={board}
            custom={edition.elements[groupKey(group)]?.color !== undefined}
            edition={edition}
            onChange={(hex) =>
                editElement(
                    session,
                    groupKey(group),
                    { color: hex },
                    `color:${group}`,
                )
            }
        />
    );
}

interface PatternPickerProps {
    label: string;
    /** A first tile for "no pattern"; off where the choice row above has it already. */
    withNone?: boolean;
    value: PatternId | undefined;
    color: string;
    onChange: (pattern: PatternId | undefined) => void;
}

/** The built-in patterns as small tiles, with a first tile for "none". */
export function PatternPicker({
    label,
    withNone = true,
    value,
    color,
    onChange,
}: PatternPickerProps) {
    const t = useTranslation();
    const { locale } = usePage().props;
    const labelId = useId();
    const tile = (
        id: PatternId | undefined,
        name: string,
    ): React.ReactElement => (
        <ToggleGroupItem
            key={id ?? NO_PATTERN}
            value={id ?? NO_PATTERN}
            aria-label={name}
            title={name}
            className="relative aspect-square h-auto min-h-14 w-full overflow-hidden bg-paper p-0 text-xs font-semibold"
        >
            {id === undefined ? (
                <span>{t('editor.style_none')}</span>
            ) : (
                <span className="absolute inset-0 block overflow-hidden">
                    <PatternFill id={id} w={14} h={14} color={color} />
                </span>
            )}
        </ToggleGroupItem>
    );

    return (
        <div className="flex flex-col gap-2">
            <span id={labelId} className="text-sm font-semibold">
                {label}
            </span>
            {/* One tile is chosen; the arrow keys move between them (shadcn ToggleGroup, B196). */}
            <ToggleGroup
                type="single"
                variant="outline"
                spacing={2}
                value={value ?? NO_PATTERN}
                onValueChange={(next) => {
                    if (next === NO_PATTERN) {
                        onChange(undefined);
                    } else if (isPatternId(next)) {
                        onChange(next);
                    }
                }}
                aria-labelledby={labelId}
                className="grid w-full grid-cols-3 sm:grid-cols-5"
            >
                {withNone && tile(undefined, t('editor.style_none'))}
                {PATTERN_IDS.map((id) => tile(id, PATTERN_NAMES[id][locale]))}
            </ToggleGroup>
        </div>
    );
}
