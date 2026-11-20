import {
    BANKNOTE_SIZE_MM,
    Banknote,
    BoardCenter,
    BoardSpace,
    BoxLid,
    CARD_SIZE_MM,
    GameCard,
    HouseRulesCard,
    PAWN_SIZE_MM,
    PawnSheetItem,
    TitleDeed,
    spaceSize,
    type RenderLayer,
} from '@/components/render';
import { parseKey } from '@/lib/edition/keys';
import type { ResolvedEdition } from '@/lib/edition/resolve';
import type {
    Edition,
    FreeLayer,
    PhotoPlacement,
    PhotoStyle,
} from '@/lib/edition/types';
import { photoSource, type PhotoInfos } from '@/lib/editor/photo-cache';
import {
    deedsFor,
    isOwnable,
    spaceAt,
    standardEdition,
} from '@/lib/game/standard-edition';
import { centerRect } from '@/lib/print/board';

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
            ? { ...box, kind: 'text', text: layer.text }
            : {
                  ...box,
                  kind: 'photo',
                  photo: photoSource(layer.photo, photos),
              };
    });
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

export function previewSize(
    target: PreviewTarget,
    edition: Edition,
): ElementSize {
    const kind = parseKey(target.key)?.kind;
    const profile = edition.boardProfile;

    switch (kind) {
        case 'space': {
            const position = Number(target.key.split('.')[1]);
            if (target.deed === true) {
                return { w: CARD_SIZE_MM.width, h: CARD_SIZE_MM.height };
            }

            return spaceSize(spaceAt(position), profile);
        }
        case 'deed':
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
        case 'boardCenter': {
            const centre = centerRect(profile);

            return { w: centre.w, h: centre.h };
        }
        default:
            return { w: 50, h: 50 };
    }
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
    const common = {
        theme: resolved.theme,
        locale: resolved.language,
        currency: resolved.currency.id,
        bleedMm,
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
                        <TitleDeed
                            {...common}
                            space={deed.space}
                            side="front"
                            name={deed.name}
                            town={deed.town}
                            photo={source(deed.photo, deed.photoStyle)}
                        />
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
                    photo={source(space.photo, space.photoStyle)}
                />
            );
        }
        case 'deed': {
            const index = Number(target.key.split('.')[1]);
            const deed = deedsFor()[index - 1];
            const resolvedDeed = resolved.deeds?.[index - 1];
            if (deed === undefined || resolvedDeed === undefined) {
                return null;
            }

            return (
                <TitleDeed
                    {...common}
                    space={deed}
                    side="front"
                    name={resolvedDeed.name}
                    town={resolvedDeed.town}
                    photo={source(resolvedDeed.photo, resolvedDeed.photoStyle)}
                />
            );
        }
        case 'card': {
            const [, deck, number] = target.key.split('.');
            if (deck !== 'chance' && deck !== 'chest') {
                return null;
            }
            const index = Number(number) - 1;
            const card = standardEdition.decks[deck][index];
            const resolvedCard = resolved.decks?.[deck][index];
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
                    amount={resolvedCard.amount}
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
                    photo={source(back.photo)}
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
                    profile={resolved.boardProfile}
                    photo={source(lid.photo, lid.photoStyle)}
                    layers={toRenderLayers(lid.layers, photos)}
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
        case 'boardCenter':
            return (
                <BoardCenter
                    {...common}
                    editionName={resolved.boardCenter.name ?? resolved.name}
                    profile={resolved.boardProfile}
                    layers={toRenderLayers(resolved.boardCenter.layers, photos)}
                />
            );
        default:
            return null;
    }
}
