import { useMemo, type CSSProperties, type ReactNode } from 'react';

import {
    BANKNOTE_SIZE_MM,
    Banknote,
    Board,
    BoxLid,
    CARD_SIZE_MM,
    centerTitleOf,
    DiceSheet,
    FoldSheet,
    GameCard,
    Invitation,
    PAWN_SIZE_MM,
    PawnSheetItem,
    RulesBookletPage,
    TitleDeed,
    type SpaceOverride,
} from '@/components/render';
import { resolveEdition } from '@/lib/edition/resolve';
import type { Edition } from '@/lib/edition/types';
import { photoSource, type PhotoInfos } from '@/lib/editor/photo-cache';
import { deedsFor, standardEdition } from '@/lib/game/standard-edition';
import { A4, BOOKLET_PAGE, INVITATION } from '@/lib/print/extras';
import { allPartsOn } from '@/lib/print/print-edition';
import { rulesContext } from '@/lib/render/rules-context';
import type { PrintPart } from '@/types/generated';

interface PartThumbProps {
    part: PrintPart;
    edition: Edition;
    /** Edge of the square the thumbnail sits in, in px. */
    size?: number;
    /** The photos of this browser, to show in the frames; a photo that is not here is left out. */
    photos?: PhotoInfos;
}

/** Artwork of a given size in mm, shrunk to fit a box of `box` px and placed with a small turn. */
function Placed({
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
}) {
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
}

const MM_PX = 96 / 25.4;

/** The scale that makes `mm` millimetres as wide as `px` pixels. */
function fit(mm: number, px: number): number {
    return px / (mm * MM_PX);
}

/**
 * The part as it prints, small: the real renderers with the edition's own theme and names, so the page
 * shows what you are about to make (B104). Decorative; the row says the name and the spec in text.
 */
const NO_PHOTOS: PhotoInfos = new Map();

export function PartThumb({
    part,
    edition,
    size = 112,
    photos = NO_PHOTOS,
}: PartThumbProps) {
    const resolved = useMemo(
        () => resolveEdition(allPartsOn(edition)),
        [edition],
    );
    const common = {
        theme: resolved.theme,
        locale: resolved.language,
        currency: resolved.currency.id,
    } as const;
    const chance = standardEdition.decks.chance[0];
    const deed = deedsFor()[0];

    let content: ReactNode = null;

    switch (part) {
        case 'board': {
            const outer = resolved.boardProfile.outer;
            const spaces: Record<number, SpaceOverride> = {};

            for (const space of resolved.spaces) {
                const photo = photoSource(
                    space.photo,
                    photos,
                    space.photoStyle,
                );

                spaces[space.position] = {
                    name: space.name,
                    ...(space.town === undefined ? {} : { town: space.town }),
                    ...(photo === undefined ? {} : { photo }),
                };
            }

            content = (
                <Placed
                    width={outer}
                    height={outer}
                    scale={fit(outer, size - 4)}
                    x={2}
                    y={2}
                >
                    <Board
                        {...common}
                        editionName={resolved.boardCenter.name ?? resolved.name}
                        profile={resolved.boardProfile}
                        spaces={spaces}
                        centerTitle={centerTitleOf(
                            resolved.boardCenter,
                            undefined,
                        )}
                    />
                </Placed>
            );
            break;
        }
        case 'cards': {
            const k = fit(CARD_SIZE_MM.width, size * 0.58);
            const h = CARD_SIZE_MM.height * MM_PX * k;

            content = (
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
            break;
        }
        case 'money': {
            const k = fit(BANKNOTE_SIZE_MM.w, size * 0.82);
            const h = BANKNOTE_SIZE_MM.h * MM_PX * k;

            content = (
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
            break;
        }
        case 'tokens': {
            const k = fit(PAWN_SIZE_MM.w, size * 0.42);

            content = (
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
            break;
        }
        case 'box_lid': {
            const lid = resolved.boardProfile.boxLid;
            const edge = Math.max(lid.w, lid.h);

            content = (
                <Placed
                    width={lid.w}
                    height={lid.h}
                    scale={fit(edge, size - 4)}
                    x={2}
                    y={2}
                >
                    <BoxLid
                        {...common}
                        editionName={resolved.boxLid?.name ?? resolved.name}
                        profile={resolved.boardProfile}
                        photo={photoSource(
                            resolved.boxLid?.photo,
                            photos,
                            resolved.boxLid?.photoStyle,
                        )}
                    />
                </Placed>
            );
            break;
        }
        case 'rules_booklet': {
            const k = fit(BOOKLET_PAGE.w, size * 0.62);

            content = (
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
            break;
        }
        case 'fold_models':
            content = (
                <Placed
                    width={A4.w}
                    height={A4.h}
                    scale={fit(A4.h, size - 4)}
                    x={size * 0.14}
                    y={2}
                >
                    <FoldSheet
                        {...common}
                        kind="house"
                        number={1}
                        sheets={2}
                        count={24}
                        photo={photoSource(resolved.foldModels?.photo, photos)}
                    />
                </Placed>
            );
            break;
        case 'dice':
            content = (
                <Placed
                    width={A4.w}
                    height={A4.h}
                    scale={fit(A4.h, size - 4)}
                    x={size * 0.14}
                    y={2}
                >
                    <DiceSheet
                        {...common}
                        editionName={resolved.name}
                        photo={photoSource(resolved.dice?.photo, photos)}
                    />
                </Placed>
            );
            break;
        case 'invitation':
            content = (
                <Placed
                    width={INVITATION.w}
                    height={INVITATION.h}
                    scale={fit(INVITATION.h, size - 6)}
                    x={size * 0.2}
                    y={3}
                    turn={3}
                >
                    <Invitation
                        {...common}
                        text={resolved.invitation?.text ?? ''}
                        editionName={resolved.boardCenter.name ?? resolved.name}
                        profile={resolved.boardProfile}
                        centerTitle={centerTitleOf(
                            resolved.boardCenter,
                            undefined,
                        )}
                        spaceNames={Object.fromEntries(
                            resolved.spaces.map((space) => [
                                space.position,
                                space.name,
                            ]),
                        )}
                        photo={photoSource(resolved.invitation?.photo, photos)}
                    />
                </Placed>
            );
            break;
        case 'calibration':
            content = <CalibrationThumb size={size} />;
            break;
    }

    return (
        <span
            aria-hidden="true"
            className="relative block flex-none overflow-hidden"
            style={{ width: size, height: size }}
            data-thumb={part}
        >
            {content}
        </span>
    );
}

/** A ruler and a bank card outline: the test sheet is not an edition part. */
function CalibrationThumb({ size }: { size: number }) {
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
}
