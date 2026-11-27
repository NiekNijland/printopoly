import { Banknote } from '@/components/render/banknote';
import { BANKNOTE_SIZE_MM } from '@/components/render/banknote-parts';
import { Board, BoardCenter, centerTitleOf } from '@/components/render/board';
import {
    boardPropsOf,
    type BoardSources,
} from '@/components/render/board-props';
import { spaceSize } from '@/components/render/board-space';
import { BoxLid } from '@/components/render/box-lid';
import { CARD_SIZE_MM } from '@/components/render/game-card';
import { HouseRulesCard } from '@/components/render/house-rules';
import { Invitation } from '@/components/render/invitation';
import { PAWN_SIZE_MM, PawnSheetItem } from '@/components/render/pawn';
import { parseKey } from '@/lib/render/edition-keys';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';
import { renderWords } from '@/lib/render/edition-words';
import { deedKeyForSpace } from '@/lib/render/editor-catalogue';
import {
    iconSource,
    photoSource,
    type PhotoInfos,
} from '@/lib/render/editor-photo-cache';
import { centerRect } from '@/lib/render/print-board';
import { INVITATION } from '@/lib/render/print-extras';
import { spaceAt } from '@/lib/render/standard-edition';
import { buildStyle } from '@/lib/render/style';

import { CardBackPreview, CardPreview } from './editor-card-preview';
import { DeedPreview, SPREAD_GAP, SpacePreview } from './editor-deed-preview';
import {
    partSource,
    toRenderLayers,
    type PreviewPart,
} from './editor-preview-part';

/** The board sources of the editor: the photos of this browser (bug 5 of ronde 3). */
export const editorSources = (photos: PhotoInfos): BoardSources => {
    return {
        photo: (_key, placement, style) =>
            photoSource(placement, photos, style),
        icon: (_key, icon) => iconSource(icon, photos),
        layers: (_key, layers) => toRenderLayers(layers, photos),
    };
};

export type PreviewTarget = {
    /** Element key; a space key with `deed` set shows its title deed. */
    key: string;
    deed?: boolean;
    side?: 'front' | 'back';
};

export type ElementSize = {
    w: number;
    h: number;
};

/** Whether a deed has a story (B169): the preview then shows its back next to the front, where the story is. */
const deedHasStory = (edition: Edition, key: string | undefined): boolean => {
    return (
        key !== undefined && (edition.elements[key]?.text ?? '').trim() !== ''
    );
};

export const previewSize = (
    target: PreviewTarget,
    edition: Edition,
): ElementSize => {
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
};

type ElementPreviewProps = {
    target: PreviewTarget;
    resolved: ResolvedEdition;
    photos: PhotoInfos;
    /** Bleed around the trim size; the stage clips it again. */
    bleedMm?: number;
};

/** Draws one element of an edition with the renderers, the way it prints (B2). */
export const ElementPreview = ({
    target,
    resolved,
    photos,
    bleedMm = 0,
}: ElementPreviewProps) => {
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
    const part = { target, resolved, photos, common };

    switch (kind) {
        case 'space':
            return <SpacePreview {...part} />;
        case 'deed':
            return <DeedPreview {...part} />;
        case 'card':
            return <CardPreview {...part} />;
        case 'cardBack':
            return <CardBackPreview {...part} />;
        case 'note':
            return <NotePreview {...part} />;
        case 'pawn':
            return <PawnPreview {...part} />;
        case 'boxLid':
            return <BoxLidPreview {...part} />;
        case 'houseRules':
            return <HouseRulesPreview {...part} />;
        case 'themeAccent':
            // The whole board, as the edition panel shows it (B145): theme, colours, words and photos at once.
            return (
                <Board
                    {...boardPropsOf(resolved, editorSources(photos))}
                    bleedMm={bleedMm}
                />
            );
        case 'invitation':
            return <InvitationPreview {...part} />;
        case 'boardCenter':
            return <CenterPreview {...part} />;
        default:
            return null;
    }
};

const NotePreview = ({ target, resolved, photos, common }: PreviewPart) => {
    const source = partSource(photos);
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
};

const PawnPreview = ({ target, resolved, photos, common }: PreviewPart) => {
    const source = partSource(photos);
    const index = Number(target.key.split('.')[1]);
    const pawn = resolved.pawns?.find((candidate) => candidate.index === index);
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
};

const BoxLidPreview = ({ resolved, photos, common }: PreviewPart) => {
    const source = partSource(photos);
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
            titleStyle={lid.titleStyle}
            profile={resolved.boardProfile}
            photo={source(lid.photo, lid.photoStyle)}
            logo={lid.logo}
            layers={toRenderLayers(lid.layers, photos)}
            board={boardPropsOf(resolved, editorSources(photos))}
        />
    );
};

const HouseRulesPreview = ({ resolved, photos, common }: PreviewPart) => {
    const source = partSource(photos);
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
};

const InvitationPreview = ({ resolved, photos, common }: PreviewPart) => {
    const source = partSource(photos);
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
};

const CenterPreview = ({ resolved, photos, common }: PreviewPart) => {
    const source = partSource(photos);

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
};
