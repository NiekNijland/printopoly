import type { ReactNode } from 'react';

import {
    BANKNOTE_SIZE_MM,
    Banknote,
    Board,
    BoardCenter,
    centerTitleOf,
    BoardSpace,
    BoxLid,
    CARD_SIZE_MM,
    GameCard,
    HouseRulesCard,
    Invitation,
    PAWN_SIZE_MM,
    PawnSheetItem,
    TitleDeed,
    spaceSize,
    boardPropsOf,
    layerLook,
    type BoardSources,
    type RenderLayer,
} from '@/components/render';
import { parseKey } from '@/lib/edition/keys';
import {
    deckIcon,
    resolvedCardOf,
    type ResolvedEdition,
} from '@/lib/edition/resolve';
import type {
    Edition,
    FreeLayer,
    PhotoPlacement,
    PhotoStyle,
} from '@/lib/edition/types';
import { renderWords } from '@/lib/edition/words';
import { deedKeyForSpace } from '@/lib/editor/catalogue';
import {
    iconSource,
    photoSource,
    type PhotoInfos,
} from '@/lib/editor/photo-cache';
import { deedsFor, isOwnable, spaceAt } from '@/lib/game/standard-edition';
import { centerRect } from '@/lib/print/board';
import { INVITATION } from '@/lib/print/extras';
import { buildStyle } from '@/lib/render/style';

/** Free layers with their photos turned into sources, for the renderers. */
function toRenderLayers(
    layers: readonly FreeLayer[],
    photos: PhotoInfos,
): RenderLayer[] {
    return layers.map((layer): RenderLayer => {
        const box = {
            id: layer.id,
            x: layer.x,
            y: layer.y,
            w: layer.w,
            h: layer.h,
            ...(layer.rotation === undefined
                ? {}
                : { rotation: layer.rotation }),
        };

        return layer.kind === 'text'
            ? { ...box, kind: 'text', text: layer.text, ...layerLook(layer) }
            : {
                  ...box,
                  kind: 'photo',
                  photo: photoSource(layer.photo, photos),
              };
    });
}

/** The board sources of the editor: the photos of this browser (bug 5 of ronde 3). */
export function editorSources(photos: PhotoInfos): BoardSources {
    return {
        photo: (_key, placement, style) =>
            photoSource(placement, photos, style),
        icon: (_key, icon) => iconSource(icon, photos),
        layers: (_key, layers) => toRenderLayers(layers, photos),
    };
}

export interface PreviewTarget {
    /** Element key; a space key with `deed` set shows its title deed. */
    key: string;
    deed?: boolean;
    side?: 'front' | 'back';
}

export interface ElementSize {
    w: number;
    h: number;
}

/** Room between the front and the back of a deed with a story, in mm. */
const SPREAD_GAP = 6;

/** Whether a deed has a story (B169): the preview then shows its back next to the front, where the story is. */
function deedHasStory(edition: Edition, key: string | undefined): boolean {
    return (
        key !== undefined && (edition.elements[key]?.text ?? '').trim() !== ''
    );
}

export function previewSize(
    target: PreviewTarget,
    edition: Edition,
): ElementSize {
    const kind = parseKey(target.key)?.kind;
    const profile = edition.boardProfile;
    const spread = {
        w: 2 * CARD_SIZE_MM.width + SPREAD_GAP,
        h: CARD_SIZE_MM.height,
    };

    switch (kind) {
        case 'space': {
            const position = Number(target.key.split('.')[1]);
            if (target.deed === true) {
                return deedHasStory(edition, deedKeyForSpace(position))
                    ? spread
                    : { w: CARD_SIZE_MM.width, h: CARD_SIZE_MM.height };
            }

            return spaceSize(spaceAt(position), profile);
        }
        case 'deed':
            return deedHasStory(edition, target.key)
                ? spread
                : { w: CARD_SIZE_MM.width, h: CARD_SIZE_MM.height };
        case 'card':
        case 'cardBack':
        case 'houseRules':
            return { w: CARD_SIZE_MM.width, h: CARD_SIZE_MM.height };
        case 'note':
            return BANKNOTE_SIZE_MM;
        case 'pawn':
            return PAWN_SIZE_MM;
        case 'boxLid':
            return profile.boxLid;
        case 'invitation':
            return INVITATION;
        case 'boardCenter': {
            const centre = centerRect(profile);

            return { w: centre.w, h: centre.h };
        }
        case 'themeAccent':
            return { w: profile.outer, h: profile.outer };
        default:
            return { w: 50, h: 50 };
    }
}

/** A deed alone, or with a story its front and back side by side, so the story shows where it prints (B169). */
function DeedSpread({
    story,
    children,
}: {
    story: string | undefined;
    children: (side: 'front' | 'back') => ReactNode;
}) {
    if (story === undefined) {
        return children('front');
    }

    return (
        <div
            style={{
                display: 'flex',
                gap: `${SPREAD_GAP}mm`,
                width: `${2 * CARD_SIZE_MM.width + SPREAD_GAP}mm`,
            }}
            data-deed-spread=""
        >
            <div style={{ flex: 'none' }}>{children('front')}</div>
            <div style={{ flex: 'none' }}>{children('back')}</div>
        </div>
    );
}

interface ElementPreviewProps {
    target: PreviewTarget;
    resolved: ResolvedEdition;
    photos: PhotoInfos;
    /** Bleed around the trim size; the stage clips it again. */
    bleedMm?: number;
}

/** Draws one element of an edition with the renderers, the way it prints (B2). */
export function ElementPreview({
    target,
    resolved,
    photos,
    bleedMm = 0,
}: ElementPreviewProps) {
    const style = buildStyle(resolved);
    const common = {
        theme: resolved.theme,
        locale: resolved.language,
        currency: resolved.currency.id,
        words: renderWords(resolved.words),
        bleedMm,
        ...(style === undefined ? {} : { style }),
    } as const;
    const kind = parseKey(target.key)?.kind;
    const source = (
        placement: PhotoPlacement | undefined,
        style?: PhotoStyle,
    ) => photoSource(placement, photos, style);

    switch (kind) {
        case 'space': {
            const position = Number(target.key.split('.')[1]);
            const space = resolved.spaces[position];
            if (space === undefined) {
                return null;
            }
            if (target.deed === true && isOwnable(space.base)) {
                const deed = resolved.deeds?.find(
                    (candidate) => candidate.space.position === position,
                );
                if (deed !== undefined) {
                    return (
                        <DeedSpread story={deed.story}>
                            {(side) => (
                                <TitleDeed
                                    {...common}
                                    space={deed.space}
                                    side={side}
                                    name={deed.name}
                                    town={deed.town}
                                    story={deed.story}
                                    photo={
                                        side === 'front'
                                            ? source(
                                                  deed.photo,
                                                  deed.photoStyle,
                                              )
                                            : undefined
                                    }
                                    icon={iconSource(space.icon, photos)}
                                />
                            )}
                        </DeedSpread>
                    );
                }
            }

            return (
                <BoardSpace
                    {...common}
                    space={space.base}
                    profile={resolved.boardProfile}
                    name={space.name}
                    town={space.town}
                    text={space.text}
                    photo={source(space.photo, space.photoStyle)}
                    icon={iconSource(space.icon, photos)}
                />
            );
        }
        case 'deed': {
            const index = Number(target.key.split('.')[1]);
            const resolvedDeed = resolved.deeds?.[index - 1];
            // The deed of the edition carries its own amounts (B132).
            const deed = resolvedDeed?.space ?? deedsFor()[index - 1];
            if (deed === undefined || resolvedDeed === undefined) {
                return null;
            }

            return (
                <DeedSpread story={resolvedDeed.story}>
                    {(side) => (
                        <TitleDeed
                            {...common}
                            space={deed}
                            side={side}
                            name={resolvedDeed.name}
                            town={resolvedDeed.town}
                            story={resolvedDeed.story}
                            photo={
                                side === 'front'
                                    ? source(
                                          resolvedDeed.photo,
                                          resolvedDeed.photoStyle,
                                      )
                                    : undefined
                            }
                            icon={iconSource(
                                resolved.spaces[deed.position]?.icon,
                                photos,
                            )}
                        />
                    )}
                </DeedSpread>
            );
        }
        case 'card': {
            const deck = target.key.split('.')[1];
            if (deck !== 'chance' && deck !== 'chest') {
                return null;
            }
            const resolvedCard = resolvedCardOf(resolved, target.key);
            const card = resolvedCard?.base;
            if (card === undefined || resolvedCard === undefined) {
                return null;
            }

            return (
                <GameCard
                    {...common}
                    deck={deck}
                    side="front"
                    card={card}
                    text={resolvedCard.text}
                    amount={resolvedCard.lineAmount}
                    purpose={resolvedCard.purpose}
                    photo={source(resolvedCard.photo, resolvedCard.photoStyle)}
                />
            );
        }
        case 'cardBack': {
            const deck = target.key.split('.')[1];
            const back =
                deck === 'chance' || deck === 'chest'
                    ? resolved.cardBacks?.[deck]
                    : resolved.deedBack;
            if (back === null || back === undefined) {
                return null;
            }
            if (deck === 'deed') {
                const first = deedsFor()[0];
                if (first === undefined) {
                    return null;
                }

                return (
                    <TitleDeed
                        {...common}
                        space={first}
                        side="back"
                        photo={source(back.photo)}
                        layers={toRenderLayers(back.layers, photos)}
                    />
                );
            }

            return (
                <GameCard
                    {...common}
                    deck={deck === 'chance' ? 'chance' : 'chest'}
                    side="back"
                    edition={resolved.name}
                    pattern={back.pattern}
                    photo={source(back.photo)}
                    icon={iconSource(
                        deckIcon(
                            resolved,
                            deck === 'chance' ? 'chance' : 'chest',
                        ),
                        photos,
                    )}
                    layers={toRenderLayers(back.layers, photos)}
                />
            );
        }
        case 'note': {
            const value = Number(target.key.split('.')[1]);
            const note = resolved.money?.notes.find(
                (candidate) => candidate.value === value,
            );
            if (note === undefined) {
                return null;
            }

            return (
                <Banknote
                    {...common}
                    value={note.value}
                    color={note.color}
                    bankName={resolved.money?.bankName}
                    editionName={resolved.name}
                    photo={source(note.photo, note.photoStyle)}
                />
            );
        }
        case 'pawn': {
            const index = Number(target.key.split('.')[1]);
            const pawn = resolved.pawns?.find(
                (candidate) => candidate.index === index,
            );
            if (pawn === undefined) {
                return null;
            }

            return (
                <PawnSheetItem
                    {...common}
                    name={pawn.name}
                    photo={source(pawn.photo, pawn.photoStyle)}
                />
            );
        }
        case 'boxLid': {
            const lid = resolved.boxLid;
            if (lid === null) {
                return null;
            }

            return (
                <BoxLid
                    {...common}
                    editionName={lid.name ?? resolved.name}
                    subtitle={lid.subtitle}
                    lines={lid.text}
                    titleOffset={lid.titleOffset}
                    titleBand={lid.titleBand}
                    profile={resolved.boardProfile}
                    photo={source(lid.photo, lid.photoStyle)}
                    layers={toRenderLayers(lid.layers, photos)}
                    board={boardPropsOf(resolved, editorSources(photos))}
                />
            );
        }
        case 'houseRules': {
            const rules = resolved.houseRules;
            if (rules === null) {
                return null;
            }

            return (
                <HouseRulesCard
                    {...common}
                    text={rules.text ?? ''}
                    editionName={resolved.name}
                    photo={source(rules.photo)}
                />
            );
        }
        case 'themeAccent':
            // The whole board, as the edition panel shows it (B145): theme, colours, words and photos at once.
            return (
                <Board
                    {...boardPropsOf(resolved, editorSources(photos))}
                    bleedMm={bleedMm}
                />
            );
        case 'invitation': {
            const invitation = resolved.invitation;
            if (invitation === null) {
                return null;
            }

            return (
                <Invitation
                    {...common}
                    text={invitation.text ?? ''}
                    headline={invitation.name}
                    kicker={invitation.subtitle}
                    editionName={resolved.boardCenter.name ?? resolved.name}
                    profile={resolved.boardProfile}
                    board={boardPropsOf(resolved, editorSources(photos))}
                    photo={source(invitation.photo)}
                />
            );
        }
        case 'boardCenter':
            return (
                <BoardCenter
                    {...common}
                    editionName={resolved.boardCenter.name ?? resolved.name}
                    profile={resolved.boardProfile}
                    title={centerTitleOf(
                        resolved.boardCenter,
                        source(resolved.boardCenter.photo),
                        source(resolved.boardCenter.background),
                    )}
                    layers={toRenderLayers(resolved.boardCenter.layers, photos)}
                />
            );
        default:
            return null;
    }
}
