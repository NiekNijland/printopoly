import { usePage } from '@inertiajs/react';
import { useState } from 'react';

import { FieldLabel } from '@/components/editor/panel/panel-parts';
import { PatternFill } from '@/components/render/pattern-fill';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/use-translation';
import { groupKey } from '@/lib/edition/keys';
import type { ResolvedEdition } from '@/lib/edition/resolve';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition } from '@/lib/edition/types';
import { editElement } from '@/lib/editor/edit';
import type { GroupId } from '@/lib/game/types';
import { toPrintSafe } from '@/lib/render/gamut';
import { PALETTES } from '@/lib/render/palettes';
import {
    PATTERN_IDS,
    PATTERN_NAMES,
    type PatternId,
} from '@/lib/render/patterns';
import { cn } from '@/lib/utils';

const HEX = /^#[0-9a-fA-F]{6}$/;

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
                {PALETTES[edition.theme].map((swatch) => (
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
    const color =
        resolved.groups.find((candidate) => candidate.id === group)?.color ??
        '#000000';

    return (
        <ColorField
            id={`group-${group}`}
            label={label}
            tag={tag}
            value={color}
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
    const tile = (
        id: PatternId | undefined,
        name: string,
    ): React.ReactElement => (
        <button
            key={id ?? 'none'}
            type="button"
            aria-pressed={value === id}
            aria-label={name}
            title={name}
            onClick={() => onChange(id)}
            className={cn(
                'relative flex aspect-square min-h-14 w-full cursor-pointer items-center justify-center overflow-hidden rounded-control border-2 bg-paper p-0 text-xs font-semibold',
                value === id
                    ? 'border-ink outline-3 outline-offset-1 outline-ink'
                    : 'border-line-strong',
            )}
        >
            {id === undefined ? (
                <span>{t('editor.style_none')}</span>
            ) : (
                <span className="absolute inset-0 block overflow-hidden">
                    <PatternFill id={id} w={14} h={14} color={color} />
                </span>
            )}
        </button>
    );

    return (
        <div className="flex flex-col gap-2" role="group" aria-label={label}>
            <span className="text-sm font-semibold">{label}</span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {withNone && tile(undefined, t('editor.style_none'))}
                {PATTERN_IDS.map((id) => tile(id, PATTERN_NAMES[id][locale]))}
            </div>
        </div>
    );
}
