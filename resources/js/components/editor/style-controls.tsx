import { usePage } from '@inertiajs/react';
import { useState } from 'react';

import { FieldLabel } from '@/components/editor/panel/panel-parts';
import { PatternFill } from '@/components/render/pattern-fill';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/use-translation';
import { THEME_ACCENT_KEY, groupKey } from '@/lib/edition/keys';
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
import { THEMES } from '@/lib/render/themes';
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

interface ColorStudioProps {
    session: EditionSession;
    edition: Edition;
    resolved: ResolvedEdition;
}

/** The accent of the edition and the colour of each street group (B130). */
export function ColorStudio({ session, edition, resolved }: ColorStudioProps) {
    const t = useTranslation();
    const theme = THEMES[edition.theme];
    const accent = resolved.accent;

    return (
        <div className="flex flex-col gap-4">
            <details className="flex flex-col gap-3" open>
                <summary className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-semibold">
                    <span
                        aria-hidden="true"
                        className="rounded-sm size-5 border border-ink"
                        style={{ background: accent ?? theme.accent }}
                    />
                    <span className="flex-1">{t('editor.style_accent')}</span>
                    <span className="font-mono text-xs font-normal text-ink-soft">
                        {(accent ?? theme.accent).toUpperCase()}
                    </span>
                </summary>
                <p className="m-0 mb-2 text-xs text-ink-soft">
                    {t('editor.style_accent_hint')}
                </p>
                <ColorField
                    id="accent"
                    label={t('editor.style_accent')}
                    value={accent ?? theme.accent}
                    custom={accent !== undefined}
                    edition={edition}
                    onChange={(hex) =>
                        editElement(
                            session,
                            THEME_ACCENT_KEY,
                            { color: hex },
                            `color:${THEME_ACCENT_KEY}`,
                        )
                    }
                />
            </details>
            <h3 className="m-0 border-t border-line pt-4 text-base font-semibold">
                {t('editor.style_groups')}
            </h3>
            <p className="m-0 -mt-2 text-xs text-ink-soft">
                {t('editor.style_groups_hint')}
            </p>
            {(accent !== undefined ||
                resolved.groups.some(
                    (group) => edition.elements[group.key]?.color !== undefined,
                )) && (
                <button
                    type="button"
                    onClick={() => {
                        editElement(session, THEME_ACCENT_KEY, {
                            color: undefined,
                        });
                        for (const group of resolved.groups) {
                            if (
                                edition.elements[group.key]?.color !== undefined
                            ) {
                                editElement(session, group.key, {
                                    color: undefined,
                                });
                            }
                        }
                    }}
                    className="min-h-11 cursor-pointer self-start border-0 bg-transparent p-0 text-sm font-semibold underline underline-offset-4 disabled:cursor-default disabled:opacity-40"
                >
                    {t('editor.style_reset_all')}
                </button>
            )}
            {resolved.groups.map((group) => (
                <details key={group.id} className="flex flex-col gap-3">
                    <summary className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-semibold">
                        <span
                            aria-hidden="true"
                            className="rounded-sm h-5 w-8 border border-ink"
                            style={{ background: group.color }}
                        />
                        <span className="flex-1">{group.name}</span>
                        <span className="font-mono text-xs font-normal text-ink-soft">
                            {group.color.toUpperCase()}
                        </span>
                    </summary>
                    <GroupColorField
                        session={session}
                        edition={edition}
                        resolved={resolved}
                        group={group.id}
                        label={group.name}
                    />
                </details>
            ))}
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
