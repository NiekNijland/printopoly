import type { ReactNode } from 'react';

import { BoardSpace } from '@/components/render/board-space';
import { BoxLid } from '@/components/render/box-lid';
import { PAWN_SIZE_MM, PawnSheetItem } from '@/components/render/pawn';
import { Scaled } from '@/components/table/scaled';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTranslation } from '@/hooks/use-translation';
import {
    partStyleIds,
    partStyleKey,
    partStylesOf,
    type PartStyleIds,
    type StyledPart,
} from '@/lib/edition/part-styles';
import type { ResolvedEdition } from '@/lib/edition/resolve';
import type { EditionSession } from '@/lib/edition/session';
import { messages } from '@/lib/edition/strings';
import type { Edition } from '@/lib/edition/types';
import { renderWords } from '@/lib/edition/words';
import { editElement } from '@/lib/editor/edit';
import type { Locale } from '@/lib/game/types';
import { buildStyle, type RenderStyle } from '@/lib/render/style';
import { cn } from '@/lib/utils';

import { StandardButton } from './panel/panel-parts';

/** `theme` is "Zoals het thema": the part stores no style and follows the theme of the edition. */
type Choice<P extends StyledPart> = PartStyleIds[P] | 'theme';

interface PartStylePreviewProps {
    resolved: ResolvedEdition;
    /** The render style of the edition with this one choice for the part; `undefined` style is the theme. */
    style: RenderStyle | undefined;
}

/**
 * A small real render of a part in one style, for its tile in the choice (B268). Add one entry per part when the
 * part gets its first style; a part without an entry shows its tiles with the name only.
 */
const PART_STYLE_PREVIEWS: Partial<
    Record<StyledPart, (props: PartStylePreviewProps) => ReactNode>
> = {
    board: BoardStylePreview,
    pawns: PawnStylePreview,
    boxLid: BoxLidStylePreview,
};

/** The render props every preview shares: theme, language, currency and words of the edition, and the style. */
function commonOf(resolved: ResolvedEdition, style: RenderStyle | undefined) {
    return {
        theme: resolved.theme,
        locale: resolved.language,
        currency: resolved.currency.id,
        words: renderWords(resolved.words),
        ...(style === undefined ? {} : { style }),
    } as const;
}

/** The front of the first pawn: the portrait half and the name half (B271). */
function PawnStylePreview({ resolved, style }: PartStylePreviewProps) {
    const name = resolved.pawns?.[0]?.name ?? 'Pion 1';

    return (
        <Scaled
            widthMm={PAWN_SIZE_MM.w}
            heightMm={22.5}
            width={134}
            className="overflow-hidden rounded-[3px]"
        >
            <PawnSheetItem {...commonOf(resolved, style)} name={name} />
        </Scaled>
    );
}

/** The top of the lid: its frame, corners and the name plate, without the board picture (B271). */
function BoxLidStylePreview({ resolved, style }: PartStylePreviewProps) {
    const lid = resolved.boardProfile.boxLid;
    const shown = Math.min(lid.h * 0.3, lid.w * 0.5);

    return (
        <Scaled
            widthMm={lid.w}
            heightMm={shown}
            width={152}
            className="overflow-hidden rounded-[3px]"
        >
            <BoxLid
                {...commonOf(resolved, style)}
                editionName={resolved.boxLid?.name ?? resolved.name}
                subtitle={resolved.boxLid?.subtitle}
                titleStyle={resolved.boxLid?.titleStyle}
                profile={resolved.boardProfile}
                boardPicture={false}
            />
        </Scaled>
    );
}

/** Start, the first street and Algemeen Fonds side by side: a corner, a colour band, a price and a deck. */
function BoardStylePreview({ resolved, style }: PartStylePreviewProps) {
    const positions = [0, 1, 2];
    const common = {
        theme: resolved.theme,
        locale: resolved.language,
        currency: resolved.currency.id,
        words: renderWords(resolved.words),
        profile: resolved.boardProfile,
        ...(style === undefined ? {} : { style }),
    } as const;
    const corner = resolved.boardProfile.corner;
    const width = resolved.boardProfile.outer;
    const spaceW = (width - 2 * resolved.boardProfile.border - 2 * corner) / 9;
    const total = corner + 2 * spaceW;

    return (
        <Scaled
            widthMm={total}
            heightMm={corner}
            width={152}
            className="overflow-hidden rounded-[3px]"
        >
            <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
                {positions.map((position) => {
                    const space = resolved.spaces[position];
                    if (space === undefined) {
                        return null;
                    }

                    return (
                        <BoardSpace
                            key={position}
                            {...common}
                            space={space.base}
                            name={space.name}
                            town={space.town}
                            text={space.text}
                        />
                    );
                })}
            </div>
        </Scaled>
    );
}

/** The render style of the edition with `choice` as the style of `part`. */
function styleWith<P extends StyledPart>(
    resolved: ResolvedEdition,
    part: P,
    choice: Choice<P>,
): RenderStyle | undefined {
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
}

/**
 * "Stijl" of one part of the set (B268, Niek: "het thema van het gehele spel volgen, maar ook veel verschillende
 * thema's per onderdeel"): Zoals het thema first, then the styles of the part, each tile with a small real render
 * in the colours of the edition. Shown in Editie > Uiterlijk for every part with styles, and in the Stijl section
 * of the elements of that part. Zoals het thema stores nothing; Standaard does the same.
 */
export function PartStyleField<P extends StyledPart>({
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
}) {
    const t = useTranslation();
    const ids = partStyleIds(part);
    const current = partStylesOf(edition.elements)[part] as
        PartStyleIds[P] | undefined;
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
                {choices.map((choice) => {
                    const name =
                        choice === 'theme'
                            ? t('part_style.theme', {
                                  theme: messages[interfaceLanguage].themeName[
                                      edition.theme
                                  ],
                              })
                            : t(`part_style.${part}.${choice}`);

                    return (
                        <label
                            key={choice}
                            data-choice={choice}
                            className={cn(
                                'relative flex min-w-0 cursor-pointer flex-col gap-1 rounded-control border-2 bg-paper p-1 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
                                value === choice
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
                                            style={styleWith(
                                                resolved,
                                                part,
                                                choice,
                                            )}
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
                })}
            </RadioGroup>
        </div>
    );
}
