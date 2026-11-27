import { Banknote } from '@/components/render/banknote';
import { boardPropsOf } from '@/components/render/board-props';
import { BoxLid } from '@/components/render/box-lid';
import { Invitation } from '@/components/render/invitation';
import { PawnSheetItem } from '@/components/render/pawn';
import { RulesBookletPage } from '@/components/render/rules-booklet';
import { INVITATION_KEY, RULES_BOOKLET_KEY } from '@/lib/render/edition-keys';
import { moneyAmountOf } from '@/lib/render/print-compose-pieces';
import type { PageItem } from '@/lib/render/print-composition';
import { lidTiles } from '@/lib/render/print-lid-tiles';
import { BLEED } from '@/lib/render/print-page-frame';
import { rulesContext } from '@/lib/render/rules-context';

import { centreName, common, printSources, type ArtKit } from './print-art-kit';
import { Window } from './print-board-art';

export const NoteArt = ({ kit, item }: { kit: ArtKit; item: PageItem }) => {
    const { ctx } = kit;
    const value = Number((item.elementKey ?? '').split('.')[1]);
    const note = ctx.resolved.money?.notes.find(
        (candidate) => candidate.value === value,
    );

    if (note === undefined) {
        return null;
    }

    const photo = kit.photo(note.key);

    return (
        <Banknote
            {...common(ctx, 0)}
            value={note.value}
            color={note.color}
            bankName={ctx.resolved.money?.bankName}
            editionName={ctx.resolved.name}
            photo={photo}
        />
    );
};

export const PawnArt = ({ kit, item }: { kit: ArtKit; item: PageItem }) => {
    const { ctx } = kit;
    const index = Number((item.elementKey ?? '').split('.')[1]) - 1;
    const pawn = ctx.resolved.pawns?.find(
        (candidate) => candidate.index === index + 1,
    );

    if (pawn === undefined) {
        return null;
    }

    return (
        <PawnSheetItem
            {...common(ctx, 0)}
            name={pawn.name}
            photo={kit.photo(pawn.key)}
        />
    );
};

export const BoxLidArt = ({ kit, item }: { kit: ArtKit; item: PageItem }) => {
    const { ctx } = kit;
    const lid = ctx.resolved.boxLid;

    if (lid === null) {
        return null;
    }

    const art = (
        <BoxLid
            {...common(ctx, BLEED)}
            editionName={lid.name ?? ctx.resolved.name}
            subtitle={lid.subtitle}
            lines={lid.text}
            titleOffset={lid.titleOffset}
            titleBand={lid.titleBand}
            titleStyle={lid.titleStyle}
            profile={ctx.resolved.boardProfile}
            photo={kit.photo(lid.key)}
            logo={lid.logo}
            layers={kit.layers(lid.layers)}
            board={boardPropsOf(ctx.resolved, printSources(kit))}
        />
    );
    // At home a larger lid comes in pieces of A4 (R5-29): each sheet shows its part of the whole lid.
    const tile = lidTiles(ctx.resolved.boardProfile.boxLid).tiles.find(
        (candidate) => candidate.id === item.id,
    );

    if (ctx.set !== 'home' || tile === undefined) {
        return art;
    }

    return (
        <Window
            width={tile.visible.w}
            height={tile.visible.h}
            x={tile.visible.x + BLEED}
            y={tile.visible.y + BLEED}
            background="#fff"
        >
            {art}
        </Window>
    );
};

/** One page of the rules booklet; only the cover carries the photo. */
export const BookletArt = ({ kit, item }: { kit: ArtKit; item: PageItem }) => {
    const { ctx } = kit;
    const booklet = ctx.resolved.rulesBooklet;
    const page = Number(item.id.split('.')[1]);

    if (booklet === null) {
        return null;
    }

    const houseRules =
        ctx.parts?.houseRules === true
            ? ctx.resolved.houseRules?.text
            : undefined;

    return (
        <RulesBookletPage
            {...common(ctx, ctx.set === 'printer' ? BLEED : 0)}
            page={page}
            context={rulesContext(
                ctx.resolved,
                houseRules,
                ctx.parts?.money === true
                    ? moneyAmountOf(ctx.edition, ctx.set)
                    : undefined,
                ctx.parts !== undefined && ctx.parts.money !== true,
            )}
            photo={page === 1 ? kit.photo(RULES_BOOKLET_KEY) : undefined}
        />
    );
};

export const InvitationArt = ({ kit }: { kit: ArtKit }) => {
    const { ctx } = kit;
    const invitation = ctx.resolved.invitation;

    if (invitation === null) {
        return null;
    }

    return (
        <Invitation
            {...common(ctx, ctx.set === 'printer' ? BLEED : 0)}
            text={invitation.text ?? ''}
            headline={invitation.name}
            kicker={invitation.subtitle}
            editionName={centreName(ctx)}
            profile={ctx.resolved.boardProfile}
            board={boardPropsOf(ctx.resolved, printSources(kit))}
            photo={kit.photo(INVITATION_KEY)}
        />
    );
};
