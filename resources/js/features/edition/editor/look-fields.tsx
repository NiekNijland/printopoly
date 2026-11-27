import { useState } from 'react';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ThemeThumb } from '@/features/edition/editions/edition-choices';
import { editElement } from '@/features/edition/editor/edit';
import {
    FieldHead,
    StandardButton,
} from '@/features/edition/editor/edition-field-parts';
import { PartStyleField } from '@/features/edition/editor/part-style-field';
import { ColorField } from '@/features/edition/editor/style-controls';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { groupKey } from '@/lib/render/edition-keys';
import { partsWithStyles } from '@/lib/render/edition-part-styles';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import { changeTheme } from '@/lib/render/edition-settings';
import { messages } from '@/lib/render/edition-strings';
import { THEME_IDS, type Edition } from '@/lib/render/edition-types';
import { cn } from '@/lib/utils';
import type { Locale } from '@/types/game';

type FieldsProps = {
    session: EditionSession;
    edition: Edition;
    resolved: ResolvedEdition;
    interfaceLanguage: Locale;
};

type Group = ResolvedEdition['groups'][number];

const ThemeTiles = ({
    session,
    edition,
    interfaceLanguage,
}: Omit<FieldsProps, 'resolved'>) => {
    const t = useTranslation();
    const m = messages[interfaceLanguage];

    return (
        <RadioGroup
            aria-label={t('edition.theme')}
            value={edition.theme}
            onValueChange={(value) => {
                const id = THEME_IDS.find((theme) => theme === value);
                if (id !== undefined) {
                    session.applySettings(
                        changeTheme(session.edition, id, interfaceLanguage),
                    );
                }
            }}
            className="grid grid-cols-2 gap-2"
        >
            {THEME_IDS.map((id) => (
                <label
                    key={id}
                    className={cn(
                        'relative flex cursor-pointer flex-col gap-1 rounded-control border-2 bg-paper p-1 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
                        edition.theme === id
                            ? 'border-press shadow-[inset_0_0_0_1px_var(--color-press)]'
                            : 'border-ink',
                    )}
                >
                    <ThemeThumb
                        theme={id}
                        name={edition.name}
                        locale={edition.language}
                        currency={edition.currency}
                        compact
                    />
                    <span className="flex items-center gap-1.5 px-1 pb-0.5 text-sm font-semibold">
                        {/* The round of the radio button says the same as the red frame, for who reads it. */}
                        <RadioGroupItem
                            value={id}
                            aria-label={m.themeName[id]}
                            className="size-4 focus-visible:outline-none"
                        />
                        {m.themeName[id]}
                    </span>
                </label>
            ))}
        </RadioGroup>
    );
};

const GroupColorEditor = ({
    session,
    edition,
    group,
}: {
    session: EditionSession;
    edition: Edition;
    group: Group;
}) => {
    const t = useTranslation();

    return (
        <div className="flex flex-col gap-2 rounded-control bg-paper p-3">
            <FieldHead
                label={t('edition_panel.group_color', {
                    group: group.name,
                })}
                where={group.color.toUpperCase()}
                standard={
                    edition.elements[groupKey(group.id)]?.color ===
                    undefined ? undefined : (
                        <StandardButton
                            onClick={() =>
                                editElement(session, groupKey(group.id), {
                                    color: undefined,
                                })
                            }
                        />
                    )
                }
            />
            <ColorField
                id={`edition-group-${group.id}`}
                label={group.name}
                value={group.color}
                custom={
                    edition.elements[groupKey(group.id)]?.color !== undefined
                }
                edition={edition}
                hideReset
                onChange={(hex) =>
                    editElement(
                        session,
                        groupKey(group.id),
                        { color: hex },
                        `color:${group.id}`,
                    )
                }
            />
        </div>
    );
};

const GroupColors = ({
    session,
    edition,
    resolved,
}: Omit<FieldsProps, 'interfaceLanguage'>) => {
    const t = useTranslation();
    const [editing, setEditing] = useState<string | null>(null);
    const group = resolved.groups.find((candidate) => candidate.id === editing);

    return (
        <div className="flex flex-col gap-2">
            <FieldHead
                label={t('editor.style_groups')}
                where={t('edition_panel.groups_where')}
            />
            <div className="grid grid-cols-4 gap-1.5 min-[480px]:grid-cols-8">
                {resolved.groups.map((item) => {
                    const own =
                        edition.elements[groupKey(item.id)]?.color !==
                        undefined;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            data-field={`theme_accent.${item.id}`}
                            aria-label={t('edition_panel.group_color', {
                                group: item.name,
                            })}
                            aria-pressed={editing === item.id}
                            title={`${item.name} ${item.color.toUpperCase()}`}
                            onClick={() =>
                                setEditing((now) =>
                                    now === item.id ? null : item.id,
                                )
                            }
                            className={cn(
                                'relative h-11 w-full cursor-pointer rounded-control border-2 p-0 lg:aspect-[4/3] lg:h-auto lg:min-h-9',
                                editing === item.id
                                    ? 'border-ink outline-3 outline-offset-1 outline-ink'
                                    : 'border-ink/60',
                            )}
                            style={{ background: item.color }}
                        >
                            {own && (
                                <span
                                    aria-hidden="true"
                                    className="absolute right-1 bottom-1 size-2 rounded-full border border-card bg-ink"
                                />
                            )}
                        </button>
                    );
                })}
            </div>
            {group !== undefined && (
                <GroupColorEditor
                    session={session}
                    edition={edition}
                    group={group}
                />
            )}
            <p className="m-0 text-xs text-ink-soft">
                {t('editor.style_groups_hint')}
            </p>
        </div>
    );
};

/** Uiterlijk: the theme as four tiles in two rows and the colour per street group (B130, B145); the theme sets the accents (B203). */
export const LookFields = ({
    session,
    edition,
    resolved,
    interfaceLanguage,
}: FieldsProps) => {
    const t = useTranslation();

    return (
        <>
            <ThemeTiles
                session={session}
                edition={edition}
                interfaceLanguage={interfaceLanguage}
            />

            {/* Every part follows the theme, or takes a style of its own (B268). */}
            {partsWithStyles().length > 0 && (
                <div className="flex flex-col gap-3" data-field="part-styles">
                    <p className="m-0 text-xs text-ink-soft">
                        {t('part_style.hint')}
                    </p>
                    {partsWithStyles().map((part) => (
                        <PartStyleField
                            key={part}
                            session={session}
                            edition={edition}
                            resolved={resolved}
                            part={part}
                            interfaceLanguage={interfaceLanguage}
                        />
                    ))}
                </div>
            )}

            <GroupColors
                session={session}
                edition={edition}
                resolved={resolved}
            />
        </>
    );
};
