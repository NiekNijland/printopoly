import { useMemo, type CSSProperties, type ReactNode } from 'react';

import { Banknote } from '@/components/render/banknote';
import { BANKNOTE_SIZE_MM } from '@/components/render/banknote-parts';
import { Board } from '@/components/render/board';
import { boardPropsOf } from '@/components/render/board-props';
import { BoxLid } from '@/components/render/box-lid';
import { editorSources } from '@/components/render/editor-element-preview';
import { CARD_SIZE_MM, GameCard } from '@/components/render/game-card';
import { Invitation } from '@/components/render/invitation';
import { PAWN_SIZE_MM, PawnSheetItem } from '@/components/render/pawn';
import { RulesBookletPage } from '@/components/render/rules-booklet';
import { TitleDeed } from '@/components/render/title-deed';
import {
    resolveEdition,
    type ResolvedEdition,
} from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';
import { renderWords } from '@/lib/render/edition-words';
import { photoSource, type PhotoInfos } from '@/lib/render/editor-photo-cache';
import { allPartsOn } from '@/lib/render/print-edition';
import { BOOKLET_PAGE, INVITATION } from '@/lib/render/print-extras';
import { rulesContext } from '@/lib/render/rules-context';
import { deedsFor, standardEdition } from '@/lib/render/standard-edition';
import { buildStyle } from '@/lib/render/style';
import type { PrintPart } from '@/types/generated';

type PartThumbProps = {
    part: PrintPart;
    edition: Edition;
    /** Edge of the square the thumbnail sits in, in px. */
    size?: number;
    /** The photos of this browser, to show in the frames; a photo that is not here is left out. */
    photos?: PhotoInfos;
};

/** Artwork of a given size in mm, shrunk to fit a box of `box` px and placed with a small turn. */
const Placed = ({
    width,
    height,
    scale,
    x,
    y,
    turn = 0,
    children,
}: {
    width: number;
    height: number;
    scale: number;
    x: number;
    y: number;
    turn?: number;
    children: ReactNode;
}) => {
    const style: CSSProperties = {
        position: 'absolute',
        left: x,
        top: y,
        width: `${String(width)}mm`,
        height: `${String(height)}mm`,
        transform: `scale(${String(scale)}) rotate(${String(turn)}deg)`,
        transformOrigin: 'top left',
        boxShadow: '0 0 0 1px rgb(27 31 36 / 0.25)',
    };

    return <div style={style}>{children}</div>;
};

const MM_PX = 96 / 25.4;

/** The scale that makes `mm` millimetres as wide as `px` pixels. */
const scaleToFit = (mm: number, px: number): number => {
    return px / (mm * MM_PX);
};

/**
 * The part as it prints, small: the real renderers with the edition's own theme and names, so the page
 * shows what you are about to make (B104). Decorative; the row says the name and the spec in text.
 */
const NO_PHOTOS: PhotoInfos = new Map();

const commonOf = (resolved: ResolvedEdition) => {
    const style = buildStyle(resolved);

    return {
        theme: resolved.theme,
        locale: resolved.language,
        currency: resolved.currency.id,
        words: renderWords(resolved.words),
        ...(style === undefined ? {} : { style }),
    };
};

type Common = ReturnType<typeof commonOf>;

type ThumbProps = {
    resolved: ResolvedEdition;
    common: Common;
    size: number;
    photos: PhotoInfos;
    edition: Edition;
};

const BoardThumb = ({ resolved, size, photos }: ThumbProps) => {
    const outer = resolved.boardProfile.outer;

    // The board as everywhere else (bug 5 of ronde 3): colours, accent, own currency, words and the centre.
    return (
        <Placed
            width={outer}
            height={outer}
            scale={scaleToFit(outer, size - 4)}
            x={2}
            y={2}
        >
            <Board {...boardPropsOf(resolved, editorSources(photos))} />
        </Placed>
    );
};

const CardsThumb = ({ resolved, common, size }: ThumbProps) => {
    const chance = standardEdition.decks.chance[0];
    const deed = deedsFor()[0];
    const k = scaleToFit(CARD_SIZE_MM.width, size * 0.58);
    const h = CARD_SIZE_MM.height * MM_PX * k;

    return (
        <>
            {chance !== undefined && (
                <Placed
                    width={CARD_SIZE_MM.width}
                    height={CARD_SIZE_MM.height}
                    scale={k}
                    x={size * 0.36}
                    y={size - h - 6}
                    turn={7}
                >
                    <GameCard
                        {...common}
                        deck="chance"
                        side="front"
                        card={chance}
                    />
                </Placed>
            )}
            {deed !== undefined && (
                <Placed
                    width={CARD_SIZE_MM.width}
                    height={CARD_SIZE_MM.height}
                    scale={k}
                    x={4}
                    y={size - h - 2}
                    turn={-5}
                >
                    <TitleDeed
                        {...common}
                        space={deed}
                        side="front"
                        name={resolved.deeds?.[0]?.name}
                    />
                </Placed>
            )}
        </>
    );
};

const MoneyThumb = ({ common, size }: ThumbProps) => {
    const k = scaleToFit(BANKNOTE_SIZE_MM.w, size * 0.82);
    const h = BANKNOTE_SIZE_MM.h * MM_PX * k;

    return (
        <>
            <Placed
                width={BANKNOTE_SIZE_MM.w}
                height={BANKNOTE_SIZE_MM.h}
                scale={k}
                x={size * 0.14}
                y={size / 2 - h - 2}
                turn={4}
            >
                <Banknote {...common} value={5} />
            </Placed>
            <Placed
                width={BANKNOTE_SIZE_MM.w}
                height={BANKNOTE_SIZE_MM.h}
                scale={k}
                x={3}
                y={size / 2 + 2}
                turn={-3}
            >
                <Banknote {...common} value={100} />
            </Placed>
        </>
    );
};

const TokensThumb = ({ resolved, common, size }: ThumbProps) => {
    const k = scaleToFit(PAWN_SIZE_MM.w, size * 0.42);

    return (
        <>
            {[1, 2].map((index) => (
                <Placed
                    key={index}
                    width={PAWN_SIZE_MM.w}
                    height={PAWN_SIZE_MM.h}
                    scale={k}
                    x={4 + (index - 1) * size * 0.48}
                    y={size * 0.12 + (index - 1) * 6}
                    turn={index === 1 ? -4 : 5}
                >
                    <PawnSheetItem
                        {...common}
                        name={
                            resolved.pawns?.[index - 1]?.name ??
                            `Pion ${String(index)}`
                        }
                    />
                </Placed>
            ))}
        </>
    );
};

const BoxLidThumb = ({ resolved, common, size, photos }: ThumbProps) => {
    const lid = resolved.boardProfile.boxLid;
    const edge = Math.max(lid.w, lid.h);

    return (
        <Placed
            width={lid.w}
            height={lid.h}
            scale={scaleToFit(edge, size - 4)}
            x={2}
            y={2}
        >
            <BoxLid
                {...common}
                editionName={resolved.boxLid?.name ?? resolved.name}
                subtitle={resolved.boxLid?.subtitle}
                lines={resolved.boxLid?.text}
                titleOffset={resolved.boxLid?.titleOffset}
                titleBand={resolved.boxLid?.titleBand}
                titleStyle={resolved.boxLid?.titleStyle}
                profile={resolved.boardProfile}
                photo={photoSource(
                    resolved.boxLid?.photo,
                    photos,
                    resolved.boxLid?.photoStyle,
                )}
                logo={resolved.boxLid?.logo}
                board={boardPropsOf(resolved, editorSources(photos))}
            />
        </Placed>
    );
};

const BookletThumb = ({
    resolved,
    common,
    size,
    photos,
    edition,
}: ThumbProps) => {
    const k = scaleToFit(BOOKLET_PAGE.w, size * 0.62);

    return (
        <>
            {[2, 1].map((page) => (
                <Placed
                    key={page}
                    width={BOOKLET_PAGE.w}
                    height={BOOKLET_PAGE.h}
                    scale={k}
                    x={page === 1 ? size * 0.06 : size * 0.3}
                    y={page === 1 ? size * 0.1 : size * 0.04}
                    turn={page === 1 ? -4 : 3}
                >
                    <RulesBookletPage
                        {...common}
                        page={page}
                        context={rulesContext(
                            resolved,
                            edition.parts.houseRules
                                ? resolved.houseRules?.text
                                : undefined,
                        )}
                        photo={
                            page === 1
                                ? photoSource(
                                      resolved.rulesBooklet?.photo,
                                      photos,
                                  )
                                : undefined
                        }
                    />
                </Placed>
            ))}
        </>
    );
};

const InvitationThumb = ({ resolved, common, size, photos }: ThumbProps) => {
    return (
        <Placed
            width={INVITATION.w}
            height={INVITATION.h}
            scale={scaleToFit(INVITATION.h, size - 6)}
            x={size * 0.2}
            y={3}
            turn={3}
        >
            <Invitation
                {...common}
                text={resolved.invitation?.text ?? ''}
                headline={resolved.invitation?.name}
                kicker={resolved.invitation?.subtitle}
                editionName={resolved.boardCenter.name ?? resolved.name}
                profile={resolved.boardProfile}
                board={boardPropsOf(resolved, editorSources(photos))}
                photo={photoSource(resolved.invitation?.photo, photos)}
            />
        </Placed>
    );
};

const THUMBS: Record<
    Exclude<PrintPart, 'calibration'>,
    (props: ThumbProps) => ReactNode
> = {
    board: BoardThumb,
    cards: CardsThumb,
    money: MoneyThumb,
    tokens: TokensThumb,
    box_lid: BoxLidThumb,
    rules_booklet: BookletThumb,
    invitation: InvitationThumb,
};

export const PartThumb = ({
    part,
    edition,
    size = 112,
    photos = NO_PHOTOS,
}: PartThumbProps) => {
    const resolved = useMemo(
        () => resolveEdition(allPartsOn(edition)),
        [edition],
    );
    const common = commonOf(resolved);
    const Thumb = part === 'calibration' ? null : THUMBS[part];

    return (
        <span
            aria-hidden="true"
            data-keep-colors
            className="relative block flex-none overflow-hidden"
            style={{ width: size, height: size }}
            data-thumb={part}
        >
            {Thumb === null ? (
                <CalibrationThumb size={size} />
            ) : (
                <Thumb
                    resolved={resolved}
                    common={common}
                    size={size}
                    photos={photos}
                    edition={edition}
                />
            )}
        </span>
    );
};

/** A ruler and a bank card outline: the test sheet is not an edition part. */
const CalibrationThumb = ({ size }: { size: number }) => {
    return (
        <>
            <span
                className="absolute top-3 right-2 left-2 h-3 border-b-2 border-ink"
                style={{
                    backgroundImage:
                        'repeating-linear-gradient(to right, #1b1f24 0 1px, transparent 1px 6px)',
                    backgroundSize: '100% 60%',
                    backgroundRepeat: 'no-repeat',
                }}
            />
            <span
                className="absolute right-3 left-3 rounded-control border-2 border-ink"
                style={{ top: 32, height: size * 0.42 }}
            />
        </>
    );
};
