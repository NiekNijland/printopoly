import type { ReactNode } from 'react';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { editElement } from '@/features/edition/editor/edit';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import {
    isPartStyle,
    partStyleIds,
    partStyleKey,
    partStylesOf,
    type PartStyleIds,
    type StyledPart,
} from '@/lib/render/edition-part-styles';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import { messages } from '@/lib/render/edition-strings';
import type { Edition } from '@/lib/render/edition-types';
import { buildStyle, type RenderStyle } from '@/lib/render/style';
import { cn } from '@/lib/utils';
import type { Locale } from '@/types/game';

import { StandardButton } from './panel/panel-parts';
import {
    PART_STYLE_PREVIEWS,
    type PartStylePreviewProps,
} from './part-style-previews';

/** `theme` is "Zoals het thema": the part stores no style and follows the theme of the edition. */
type Choice<P extends StyledPart> = PartStyleIds[P] | 'theme';

/** The render style of the edition with `choice` as the style of `part`. */
const styleWith = <P extends StyledPart>(
    resolved: ResolvedEdition,
    part: P,
    choice: Choice<P>,
): RenderStyle | undefined => {
    const base = buildStyle(resolved);
    const parts = { ...base?.parts };
    if (choice === 'theme') {
        delete parts[part];
    } else {
        parts[part] = choice;
    }
    const style: RenderStyle = {
        ...(base?.groupColors === undefined
            ? {}
            : { groupColors: base.groupColors }),
        ...(Object.keys(parts).length === 0 ? {} : { parts }),
    };

    return Object.keys(style).length === 0 ? undefined : style;
};

const StyleTile = <P extends StyledPart>({
    part,
    choice,
    chosen,
    resolved,
    edition,
    interfaceLanguage,
    Preview,
}: {
    part: P;
    choice: Choice<P>;
    chosen: boolean;
    resolved: ResolvedEdition;
    edition: Edition;
    interfaceLanguage: Locale;
    Preview: ((props: PartStylePreviewProps) => ReactNode) | undefined;
}) => {
    const t = useTranslation();
    const name =
        choice === 'theme'
            ? t('part_style.theme', {
                  theme: messages[interfaceLanguage].themeName[edition.theme],
              })
            : t(`part_style.${part}.${choice}`);

    return (
        <label
            key={choice}
            data-choice={choice}
            className={cn(
                'relative flex min-w-0 cursor-pointer flex-col gap-1 rounded-control border-2 bg-paper p-1 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
                chosen
                    ? 'border-press shadow-[inset_0_0_0_1px_var(--color-press)]'
                    : 'border-ink',
            )}
        >
            {Preview !== undefined && (
                <span
                    aria-hidden="true"
                    data-keep-colors
                    className="@container pointer-events-none flex h-20 items-center justify-center overflow-hidden rounded-control bg-board px-1"
                >
                    {/* A narrow tile on a small phone shrinks the picture, never cuts it off. */}
                    <span className="flex flex-none scale-[0.76] items-center justify-center @min-[150px]:scale-100">
                        <Preview
                            resolved={resolved}
                            style={styleWith(resolved, part, choice)}
                        />
                    </span>
                </span>
            )}
            <span className="flex min-w-0 items-center gap-1.5 px-1 pb-0.5 text-sm leading-tight font-semibold">
                <RadioGroupItem
                    value={choice}
                    aria-label={name}
                    className="size-4 shrink-0 focus-visible:outline-none"
                />
                <span className="min-w-0">{name}</span>
            </span>
        </label>
    );
};

/**
 * "Stijl" of one part of the set (B268, Niek: "het thema van het gehele spel volgen, maar ook veel verschillende
 * thema's per onderdeel"): Zoals het thema first, then the styles of the part, each tile with a small real render
 * in the colours of the edition. Shown in Editie > Uiterlijk for every part with styles, and in the Stijl section
 * of the elements of that part. Zoals het thema stores nothing; Standaard does the same.
 */
export const PartStyleField = <P extends StyledPart>({
    session,
    edition,
    resolved,
    part,
    interfaceLanguage,
}: {
    session: EditionSession;
    edition: Edition;
    resolved: ResolvedEdition;
    part: P;
    interfaceLanguage: Locale;
}) => {
    const t = useTranslation();
    const ids = partStyleIds(part);
    const stored = partStylesOf(edition.elements)[part];
    const current = isPartStyle(part, stored) ? stored : undefined;
    const value: Choice<P> = current ?? 'theme';
    const label = t(`part_style.${part}.label`);
    const Preview: ((props: PartStylePreviewProps) => ReactNode) | undefined =
        PART_STYLE_PREVIEWS[part];
    const choices: readonly Choice<P>[] = ['theme', ...ids];
    const choose = (next: Choice<P>) =>
        editElement(session, partStyleKey(part), {
            style: next === 'theme' ? undefined : next,
        });

    if (ids.length === 0) {
        return null;
    }

    return (
        <div
            className="flex flex-col gap-2"
            data-part-style={part}
            role="group"
            aria-label={label}
        >
            <div className="flex min-h-8 min-w-0 flex-wrap items-center justify-between gap-x-2">
                <span className="min-w-0 text-sm font-semibold break-words">
                    {label}
                </span>
                {current === undefined ? (
                    <span className="text-right text-xs text-ink-soft">
                        {t(`part_style.${part}.where`)}
                    </span>
                ) : (
                    <StandardButton
                        label={label}
                        onClick={() => choose('theme')}
                    />
                )}
            </div>
            <RadioGroup
                aria-label={label}
                value={value}
                onValueChange={(next) => {
                    const found = choices.find((choice) => choice === next);
                    if (found !== undefined) {
                        choose(found);
                    }
                }}
                className="grid grid-cols-2 gap-2"
            >
                {choices.map((choice) => (
                    <StyleTile
                        key={choice}
                        part={part}
                        choice={choice}
                        chosen={value === choice}
                        resolved={resolved}
                        edition={edition}
                        interfaceLanguage={interfaceLanguage}
                        Preview={Preview}
                    />
                ))}
            </RadioGroup>
        </div>
    );
};
