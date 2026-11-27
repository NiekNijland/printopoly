import type { ReactNode } from 'react';

import { Banknote } from '@/components/render/banknote';
import { BANKNOTE_SIZE_MM } from '@/components/render/banknote-parts';
import { BoardSpace } from '@/components/render/board-space';
import { BoxLid } from '@/components/render/box-lid';
import { CARD_SIZE_MM, GameCard } from '@/components/render/game-card';
import { PAWN_SIZE_MM, PawnSheetItem } from '@/components/render/pawn';
import { Scaled } from '@/components/render/table-scaled';
import { TitleDeed } from '@/components/render/title-deed';
import type { StyledPart } from '@/lib/render/edition-part-styles';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import { renderWords } from '@/lib/render/edition-words';
import { deedsFor, standardEdition } from '@/lib/render/standard-edition';
import type { RenderStyle } from '@/lib/render/style';

export type PartStylePreviewProps = {
    resolved: ResolvedEdition;
    /** The render style of the edition with this one choice for the part; `undefined` style is the theme. */
    style: RenderStyle | undefined;
};

/** The 100 note of the edition, in its own colour, with its bank and edition name (B270). */
const MoneyStylePreview = ({ resolved, style }: PartStylePreviewProps) => {
    const note =
        resolved.money?.notes.find((candidate) => candidate.value === 100) ??
        resolved.money?.notes[0];

    return (
        <Scaled
            widthMm={BANKNOTE_SIZE_MM.w}
            heightMm={BANKNOTE_SIZE_MM.h}
            width={152}
            className="shadow-sm overflow-hidden rounded-[2px]"
        >
            <Banknote
                theme={resolved.theme}
                locale={resolved.language}
                currency={resolved.currency.id}
                words={renderWords(resolved.words)}
                value={note?.value ?? 100}
                {...(note === undefined ? {} : { color: note.color })}
                bankName={resolved.money?.bankName}
                editionName={resolved.name}
                {...(style === undefined ? {} : { style })}
            />
        </Scaled>
    );
};

/** The render props every preview shares: theme, language, currency and words of the edition, and the style. */
const commonOf = (
    resolved: ResolvedEdition,
    style: RenderStyle | undefined,
) => {
    return {
        theme: resolved.theme,
        locale: resolved.language,
        currency: resolved.currency.id,
        words: renderWords(resolved.words),
        ...(style === undefined ? {} : { style }),
    } as const;
};

/** The front of the first pawn: the portrait half and the name half (B271). */
const PawnStylePreview = ({ resolved, style }: PartStylePreviewProps) => {
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
};

/** The top of the lid: its frame, corners and the name plate, without the board picture (B271). */
const BoxLidStylePreview = ({ resolved, style }: PartStylePreviewProps) => {
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
};

/** Two cards side by side, a little apart: the size of a preview tile. */
const CardPair = ({ children }: { children: ReactNode }) => {
    const gap = 5;

    return (
        <Scaled
            widthMm={2 * CARD_SIZE_MM.width + gap}
            heightMm={CARD_SIZE_MM.height}
            width={116}
        >
            <div style={{ display: 'flex', gap: `${String(gap)}mm` }}>
                {children}
            </div>
        </Scaled>
    );
};

/** A Chance card with an amount line next to the back of Community Chest (B269). */
const CardStylePreview = ({ resolved, style }: PartStylePreviewProps) => {
    const common = commonOf(resolved, style);
    const card =
        standardEdition.decks.chance.find(
            (candidate) => (candidate.amount ?? 0) > 0,
        ) ?? standardEdition.decks.chance[0];

    return (
        <CardPair>
            <GameCard {...common} deck="chance" side="front" card={card} />
            <GameCard
                {...common}
                deck="chest"
                side="back"
                edition={resolved.name}
            />
        </CardPair>
    );
};

/** The first title deed of the edition, front and mortgage back (B269). */
const DeedStylePreview = ({ resolved, style }: PartStylePreviewProps) => {
    const common = commonOf(resolved, style);
    const deed = resolved.deeds?.[0];
    const space = deed?.space ?? deedsFor()[0];
    if (space === undefined) {
        return null;
    }

    return (
        <CardPair>
            {(['front', 'back'] as const).map((side) => (
                <TitleDeed
                    key={side}
                    {...common}
                    space={space}
                    side={side}
                    name={deed?.name}
                    town={deed?.town}
                />
            ))}
        </CardPair>
    );
};

/** Start, the first street and Algemeen Fonds side by side: a corner, a colour band, a price and a deck. */
const BoardStylePreview = ({ resolved, style }: PartStylePreviewProps) => {
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
};

/**
 * A small real render of a part in one style, for its tile in the choice (B268). Add one entry per part when the
 * part gets its first style; a part without an entry shows its tiles with the name only.
 */
export const PART_STYLE_PREVIEWS: Partial<
    Record<StyledPart, (props: PartStylePreviewProps) => ReactNode>
> = {
    board: BoardStylePreview,
    money: MoneyStylePreview,
    pawns: PawnStylePreview,
    boxLid: BoxLidStylePreview,
    cards: CardStylePreview,
    deeds: DeedStylePreview,
};
