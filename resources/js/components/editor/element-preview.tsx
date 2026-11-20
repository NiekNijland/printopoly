import {
    BANKNOTE_SIZE_MM,
    Banknote,
    BoardCenter,
    BoardSpace,
    BoxLid,
    CARD_SIZE_MM,
    GameCard,
    PAWN_SIZE_MM,
    PawnSheetItem,
    TitleDeed,
    spaceSize,
} from '@/components/render';
import { parseKey } from '@/lib/edition/keys';
import type { ResolvedEdition } from '@/lib/edition/resolve';
import type { Edition, LayoutId, PhotoPlacement } from '@/lib/edition/types';
import { photoSource, type PhotoInfos } from '@/lib/editor/photo-cache';
import {
    deedsFor,
    isOwnable,
    spaceAt,
    standardEdition,
} from '@/lib/game/standard-edition';
import { centerRect } from '@/lib/print/board';
import type { Layout } from '@/lib/render/themes';

export function toRenderLayout(layout: LayoutId): Layout {
    return layout === 'frame' ? 'framed' : layout;
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
    /** Tint where a photo goes (the editor, not print). */
    placeholder?: boolean;
}

/** Draws one element of an edition with the renderers, the way it prints (B2). */
export function ElementPreview({
    target,
    resolved,
    photos,
    bleedMm = 0,
    placeholder = true,
}: ElementPreviewProps) {
    const common = {
        theme: resolved.theme,
        locale: resolved.language,
        currency: resolved.currency.id,
        bleedMm,
    } as const;
    const kind = parseKey(target.key)?.kind;
    const source = (placement: PhotoPlacement | undefined) =>
        photoSource(placement, photos);

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
                            layout={toRenderLayout(deed.layout)}
                            photo={source(deed.photo)}
                            placeholder={placeholder}
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
                    layout={toRenderLayout(space.layout)}
                    photo={source(space.photo)}
                    placeholder={placeholder}
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
                    layout={toRenderLayout(resolvedDeed.layout)}
                    photo={source(resolvedDeed.photo)}
                    placeholder={placeholder}
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
                    layout={toRenderLayout(resolvedCard.layout)}
                    photo={source(resolvedCard.photo)}
                    placeholder={placeholder}
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
                        layout={toRenderLayout(back.layout)}
                        photo={source(back.photo)}
                        placeholder={placeholder}
                    />
                );
            }

            return (
                <GameCard
                    {...common}
                    deck={deck === 'chance' ? 'chance' : 'chest'}
                    side="back"
                    layout={toRenderLayout(back.layout)}
                    photo={source(back.photo)}
                    placeholder={placeholder}
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
                    layout={note.photo === undefined ? 'text' : 'framed'}
                    photo={source(note.photo)}
                    placeholder={placeholder}
                />
            );
        }
        case 'pawn': {
            const index = Number(target.key.split('.')[1]);
            const pawn = resolved.pawns?.[index - 1];
            if (pawn === undefined) {
                return null;
            }

            return (
                <PawnSheetItem
                    {...common}
                    name={pawn.name}
                    photo={source(pawn.photo)}
                    placeholder={placeholder}
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
                    layout={toRenderLayout(lid.layout)}
                    photo={source(lid.photo)}
                    placeholder={placeholder}
                />
            );
        }
        case 'boardCenter':
            return (
                <BoardCenter
                    {...common}
                    editionName={resolved.boardCenter.name ?? resolved.name}
                    profile={resolved.boardProfile}
                />
            );
        default:
            return null;
    }
}
