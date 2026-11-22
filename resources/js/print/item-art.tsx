import type { ReactNode } from 'react';

import {
    Banknote,
    Board,
    BoardCenter,
    BoardSpace,
    centerTitleOf,
    BoxLid,
    GameCard,
    HouseRulesCard,
    Invitation,
    RulesBookletPage,
    PawnSheetItem,
    TitleDeed,
    spaceSize,
    boardPropsOf,
    layerLook,
    type BoardSources,
    type RenderLayer,
    type SpaceIconSource,
} from '@/components/render';
import { SetMark } from '@/components/render/set-mark';
import {
    BOARD_CENTER_KEY,
    INVITATION_KEY,
    RULES_BOOKLET_KEY,
    parseKey,
    spaceKey,
} from '@/lib/edition/keys';
import { resolvedCardOf, type ResolvedEdition } from '@/lib/edition/resolve';
import type { Edition, FreeLayer } from '@/lib/edition/types';
import { renderWords } from '@/lib/edition/words';
import {
    deedsFor,
    spaceAt,
    standardEdition,
} from '@/lib/game/standard-edition';
import type { DeckId } from '@/lib/game/types';
import { centerRect, spaceRects } from '@/lib/print/board';
import type { PageItem, PrintSet } from '@/lib/print/composition';
import { BLEED, moneyAmountOf } from '@/lib/print/composition';
import { stickerPieces } from '@/lib/print/home-stickers';
import { lidTiles } from '@/lib/print/lid-tiles';
import { splitPanels } from '@/lib/print/panels';
import { CENTER_PHOTO_BLEED } from '@/lib/render/center-layout';
import type { PhotoSource } from '@/lib/render/photo';
import { rulesContext } from '@/lib/render/rules-context';
import { buildStyle } from '@/lib/render/style';
import { THEMES } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { AlignmentArt } from './alignment-art';

/** Bleed of a home space sticker: the sticker is 0.5 mm inside the space and has 3 mm bleed (B65). */
const STICKER_BLEED = BLEED - 0.5;

export interface ArtContext {
    edition: Edition;
    /** The edition with every part switched on: the print job decides which parts print. */
    resolved: ResolvedEdition;
    set: PrintSet;
    /**
     * The parts the edition has on, as stored. `resolved` has every part on (the print job decides which
     * print), so what depends on a part being on (the house rules in the rules booklet) reads it here.
     */
    parts?: Partial<Record<string, boolean>>;
    /**
     * Measuring mode: every placed photo gets a stand-in source, so the renderers draw the photo slot they
     * would draw in print. Used to learn the frame size of each photo (photo-targets.ts).
     */
    measure?: boolean;
}

/**
 * The photo of an element as the renderers take it. In print this is the crop the server made for exactly
 * this frame (so no transform: the picture fills the frame), and nothing when the element has no photo or
 * the server dropped it.
 */
export function photoOf(
    ctx: ArtContext,
    key: string,
    field: 'photo' | 'background' = 'photo',
): PhotoSource | undefined {
    const override = ctx.edition.elements[key];
    const photo = override?.[field] as
        { src?: string; fit?: boolean } | undefined;
    // The background photo always fills the centre; only the element photo has a style (B124).
    const style =
        field === 'photo' && override?.photoStyle === 'full'
            ? 'full'
            : undefined;

    if (photo === undefined) {
        return undefined;
    }

    // A photo that fits (B168) is cut to its visible part and drawn whole in the middle of its frame.
    const extra: Omit<PhotoSource, 'src'> = {
        ...(style === undefined ? {} : { style }),
        ...(photo.fit === true ? { fit: true } : {}),
    };

    if (ctx.measure === true) {
        return { src: 'measure', ...extra };
    }

    return photo.src === undefined ? undefined : { src: photo.src, ...extra };
}

/**
 * The chosen icon of a special space (B136) as the renderers take it. An uploaded image is the crop the server
 * made (`icon.photo.src`); without that crop the standard icon is drawn.
 */
function iconOf(ctx: ArtContext, key: string): SpaceIconSource | undefined {
    const icon = ctx.edition.elements[key]?.icon;

    if (icon === undefined) {
        return undefined;
    }

    if ('preset' in icon) {
        return { preset: icon.preset };
    }

    if (ctx.measure === true) {
        return { photo: { src: 'measure' }, aspect: icon.aspect };
    }

    const src = (icon.photo as { src?: string }).src;

    return src === undefined
        ? undefined
        : { photo: { src }, aspect: icon.aspect };
}

/** The icon of the first Chance or Community Chest space that has one, for the standard back of that deck (B136). */
function deckIconOf(
    ctx: ArtContext,
    deck: DeckId,
): SpaceIconSource | undefined {
    for (const space of standardEdition.spaces) {
        const icon =
            space.type === deck
                ? iconOf(ctx, spaceKey(space.position))
                : undefined;

        if (icon !== undefined) {
            return icon;
        }
    }

    return undefined;
}

/**
 * Free layers of an element for the renderers. A photo layer carries its own frame (`w` and `h`), so the
 * server crops it to exactly that; a layer photo shows the crop as it is, without a transform.
 */
function layersOf(
    ctx: ArtContext,
    layers: readonly FreeLayer[],
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

        if (layer.kind === 'text') {
            return {
                ...box,
                kind: 'text',
                text: layer.text,
                ...layerLook(layer),
            };
        }

        const src = (layer.photo as { src?: string }).src;

        return {
            ...box,
            kind: 'photo',
            photo:
                ctx.measure === true
                    ? { src: 'measure' }
                    : src === undefined
                      ? undefined
                      : { src },
        };
    });
}

function common(ctx: ArtContext, bleedMm: number) {
    const style = buildStyle(ctx.resolved);

    return {
        theme: ctx.resolved.theme,
        locale: ctx.resolved.language,
        currency: ctx.resolved.currency.id,
        words: renderWords(ctx.resolved.words),
        bleedMm,
        ...(style === undefined ? {} : { style }),
    } as const;
}

function deckOf(key: string): DeckId | null {
    const deck = key.split('.')[1];

    return deck === 'chance' || deck === 'chest' ? deck : null;
}

/** A card (deed, Chance or Community Chest) at 63 x 88 mm, with bleed. */
function CardArt({
    ctx,
    elementKey,
    side,
    bleedMm,
}: {
    ctx: ArtContext;
    elementKey: string;
    side: 'front' | 'back';
    bleedMm: number;
}) {
    const kind = parseKey(elementKey)?.kind;
    const props = common(ctx, bleedMm);
    const { resolved } = ctx;

    if (kind === 'houseRules') {
        const rules = resolved.houseRules;

        if (rules === null) {
            return null;
        }

        // The rules card has a front only: its back is the plain paper of the theme, so a shop that
        // prints both sides still gets a pair (B56).
        return side === 'front' ? (
            <HouseRulesCard
                {...props}
                text={rules.text ?? ''}
                editionName={resolved.name}
                photo={photoOf(ctx, elementKey)}
            />
        ) : (
            <div
                style={{
                    width: mm(63 + 2 * bleedMm),
                    height: mm(88 + 2 * bleedMm),
                    background: THEMES[resolved.theme].paper,
                }}
            />
        );
    }

    if (kind === 'deed') {
        const index = Number(elementKey.split('.')[1]) - 1;
        const deed = resolved.deeds?.[index];
        // The deed of the edition carries its own amounts (B132).
        const space = deed?.space ?? deedsFor()[index];

        if (space === undefined || deed === undefined) {
            return null;
        }

        return (
            <TitleDeed
                {...props}
                space={space}
                side={side}
                name={deed.name}
                town={deed.town}
                story={deed.story}
                photo={side === 'front' ? photoOf(ctx, elementKey) : undefined}
                icon={
                    space.type === 'street'
                        ? undefined
                        : iconOf(ctx, spaceKey(space.position))
                }
                layers={
                    side === 'back' && resolved.deedBack !== null
                        ? layersOf(ctx, resolved.deedBack.layers)
                        : undefined
                }
            />
        );
    }

    const deck = deckOf(elementKey);

    if (kind !== 'card' || deck === null) {
        return null;
    }

    const resolvedCard = resolvedCardOf(resolved, elementKey);
    const card = resolvedCard?.base;
    const back = resolved.cardBacks?.[deck];

    if (card === undefined || resolvedCard === undefined) {
        return null;
    }

    if (side === 'back') {
        return (
            <GameCard
                {...props}
                deck={deck}
                side="back"
                photo={photoOf(ctx, `card_back.${deck}`)}
                pattern={back?.pattern}
                icon={deckIconOf(ctx, deck)}
                edition={resolved.name}
                layers={
                    back === undefined ? undefined : layersOf(ctx, back.layers)
                }
            />
        );
    }

    return (
        <GameCard
            {...props}
            deck={deck}
            side="front"
            card={card}
            text={resolvedCard.text}
            amount={resolvedCard.lineAmount}
            purpose={resolvedCard.purpose}
            photo={photoOf(ctx, elementKey)}
        />
    );
}

/** One space of the board drawn upright, with the bleed given (0 on the board, 2.5 on a home sticker). */
function SpaceArt({
    ctx,
    position,
    bleedMm,
    frame,
}: {
    ctx: ArtContext;
    position: number;
    bleedMm: number;
    frame: boolean;
}) {
    const space = ctx.resolved.spaces[position];

    if (space === undefined) {
        return null;
    }

    return (
        <BoardSpace
            {...common(ctx, bleedMm)}
            space={space.base}
            profile={ctx.resolved.boardProfile}
            name={space.name}
            town={space.town}
            text={space.text}
            photo={photoOf(ctx, space.key)}
            icon={iconOf(ctx, space.key)}
            frame={frame}
        />
    );
}

function centreName(ctx: ArtContext): string {
    return ctx.resolved.boardCenter.name ?? ctx.resolved.name;
}

/** The board sources of the print: the crops the server made for each frame (bug 5 of ronde 3). */
function printSources(ctx: ArtContext): BoardSources {
    return {
        photo: (key, _placement, _style, field) => photoOf(ctx, key, field),
        icon: (key) => iconOf(ctx, key),
        layers: (_key, layers) => layersOf(ctx, layers),
    };
}

function FullBoard({ ctx }: { ctx: ArtContext }) {
    return (
        <Board {...boardPropsOf(ctx.resolved, printSources(ctx))} bleedMm={0} />
    );
}

/** A window onto a bigger piece of artwork: `source` is the part to show, in the artwork's own mm. */
function Window({
    width,
    height,
    x,
    y,
    background,
    children,
}: {
    width: number;
    height: number;
    x: number;
    y: number;
    background: string;
    children: ReactNode;
}) {
    return (
        <div
            style={{
                position: 'relative',
                width: mm(width),
                height: mm(height),
                overflow: 'hidden',
                background,
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    left: mm(-x),
                    top: mm(-y),
                }}
            >
                {children}
            </div>
        </div>
    );
}

/** Artwork of a given (unrotated) size, turned a number of degrees around its centre inside `box`. */
function Turned({
    box,
    width,
    height,
    degrees,
    children,
}: {
    box: { w: number; h: number };
    width: number;
    height: number;
    degrees: number;
    children: ReactNode;
}) {
    return (
        <div
            style={{
                position: 'absolute',
                left: mm(box.w / 2 - width / 2),
                top: mm(box.h / 2 - height / 2),
                width: mm(width),
                height: mm(height),
                transform: degrees === 0 ? undefined : `rotate(${degrees}deg)`,
            }}
        >
            {children}
        </div>
    );
}

function PanelArt({ ctx, item }: { ctx: ArtContext; item: PageItem }) {
    const profile = ctx.resolved.boardProfile;

    // The whole board for the print shop (B243): the board at full size, with the bleed around it.
    if (item.id === 'board.whole') {
        return (
            <Window
                width={item.bleed.w}
                height={item.bleed.h}
                x={-BLEED}
                y={-BLEED}
                background={THEMES[ctx.resolved.theme].boardBackground}
            >
                <FullBoard ctx={ctx} />
            </Window>
        );
    }

    const panel = splitPanels(profile).find(
        (candidate) => `panel.${candidate.id}` === item.id,
    );

    if (panel === undefined) {
        return null;
    }

    return (
        <Window
            width={panel.size.w}
            height={panel.size.h}
            x={panel.source.x}
            y={panel.source.y}
            background={THEMES[ctx.resolved.theme].boardBackground}
        >
            <FullBoard ctx={ctx} />
        </Window>
    );
}

function HomeSpaceArt({ ctx, item }: { ctx: ArtContext; item: PageItem }) {
    const position = Number(item.id.split('.')[1]);
    const profile = ctx.resolved.boardProfile;
    const rect = spaceRects(profile)[position];
    const space = ctx.resolved.spaces[position]?.base ?? spaceAt(position);

    if (rect === undefined) {
        return null;
    }

    const upright = spaceSize(space, profile);
    const width = upright.w + 2 * STICKER_BLEED;
    const height = upright.h + 2 * STICKER_BLEED;

    return (
        <Turned
            box={item.bleed}
            width={width}
            height={height}
            degrees={rect.rotation + (item.rotated === true ? 90 : 0)}
        >
            <SpaceArt
                ctx={ctx}
                position={position}
                bleedMm={STICKER_BLEED}
                frame={false}
            />
        </Turned>
    );
}

function HomeCentreArt({ ctx, item }: { ctx: ArtContext; item: PageItem }) {
    const profile = ctx.resolved.boardProfile;
    const piece = stickerPieces(profile).find(
        (candidate) => candidate.id === item.id,
    );
    const centre = centerRect(profile);

    if (piece === undefined) {
        return null;
    }

    return (
        <Turned
            box={item.bleed}
            width={piece.size.w}
            height={piece.size.h}
            degrees={item.rotated === true ? 90 : 0}
        >
            {/* The centre is drawn with the bleed of its photo, so the cut edge of a sticker is photo (R5-03). */}
            <Window
                width={piece.size.w}
                height={piece.size.h}
                x={piece.source.x - centre.x + CENTER_PHOTO_BLEED}
                y={piece.source.y - centre.y + CENTER_PHOTO_BLEED}
                background={THEMES[ctx.resolved.theme].boardBackground}
            >
                <BoardCenter
                    {...common(ctx, CENTER_PHOTO_BLEED)}
                    editionName={centreName(ctx)}
                    profile={profile}
                    layers={layersOf(ctx, ctx.resolved.boardCenter.layers)}
                    title={centerTitleOf(
                        ctx.resolved.boardCenter,
                        photoOf(ctx, BOARD_CENTER_KEY),
                        photoOf(ctx, BOARD_CENTER_KEY, 'background'),
                    )}
                />
            </Window>
        </Turned>
    );
}

function NoteArt({ ctx, item }: { ctx: ArtContext; item: PageItem }) {
    const value = Number((item.elementKey ?? '').split('.')[1]);
    const note = ctx.resolved.money?.notes.find(
        (candidate) => candidate.value === value,
    );

    if (note === undefined) {
        return null;
    }

    const photo = photoOf(ctx, note.key);

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
}

function PawnArt({ ctx, item }: { ctx: ArtContext; item: PageItem }) {
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
            photo={photoOf(ctx, pawn.key)}
        />
    );
}

function BoxLidArt({ ctx, item }: { ctx: ArtContext; item: PageItem }) {
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
            photo={photoOf(ctx, lid.key)}
            logo={lid.logo}
            layers={layersOf(ctx, lid.layers)}
            board={boardPropsOf(ctx.resolved, printSources(ctx))}
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
}

/** One page of the rules booklet; only the cover carries the photo. */
function BookletArt({ ctx, item }: { ctx: ArtContext; item: PageItem }) {
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
            photo={page === 1 ? photoOf(ctx, RULES_BOOKLET_KEY) : undefined}
        />
    );
}

function InvitationArt({ ctx }: { ctx: ArtContext }) {
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
            board={boardPropsOf(ctx.resolved, printSources(ctx))}
            photo={photoOf(ctx, INVITATION_KEY)}
        />
    );
}

/** The card frame lies 3 mm inside the cut edge; the set mark sits on it like a stamp (B242). */
const CARD_FRAME = 3;

/** On a banknote the mark sits on the inner border, under the oval with the value (NOTE_LAYOUT of banknote.tsx). */
const NOTE_MARK = { cx: 56.8, cy: 60 - 4.6 };

/**
 * Whether an item carries the set mark (B242): the back of every card (Chance, Community Chest, the house rules card
 * and the deeds), both sides of a title deed, and every banknote. Only when the PDF holds more than one set.
 */
export function carriesSetMark(item: PageItem): boolean {
    if (item.setNumber === undefined) {
        return false;
    }

    if (item.kind === 'note') {
        return true;
    }

    return (
        item.kind === 'card' &&
        (item.side === 'back' || (item.elementKey ?? '').startsWith('deed.'))
    );
}

/** The set mark of an item, placed in the item box (its bleed box) on the frame of the card or the note. */
function SetMarkOf({ ctx, item }: { ctx: ArtContext; item: PageItem }) {
    if (!carriesSetMark(item) || item.setNumber === undefined) {
        return null;
    }

    const x = item.trim.x - item.bleed.x;
    const y = item.trim.y - item.bleed.y;
    const spot =
        item.kind === 'note'
            ? { cx: x + NOTE_MARK.cx, cy: y + NOTE_MARK.cy }
            : { cx: x + item.trim.w / 2, cy: y + item.trim.h - CARD_FRAME };

    return (
        <SetMark
            number={item.setNumber}
            theme={THEMES[ctx.resolved.theme]}
            {...spot}
        />
    );
}

/** What an item of a page shows: the real renderer of its element, at true size, with its set mark (B242). */
export function ItemArt({
    ctx,
    item,
}: {
    ctx: ArtContext;
    item: PageItem;
}): ReactNode {
    return (
        <>
            <ItemBody ctx={ctx} item={item} />
            <SetMarkOf ctx={ctx} item={item} />
        </>
    );
}

function ItemBody({
    ctx,
    item,
}: {
    ctx: ArtContext;
    item: PageItem;
}): ReactNode {
    switch (item.kind) {
        case 'panel':
            return <PanelArt ctx={ctx} item={item} />;
        case 'space':
            return <HomeSpaceArt ctx={ctx} item={item} />;
        case 'center':
            return <HomeCentreArt ctx={ctx} item={item} />;
        case 'card':
            // The card is drawn with its full bleed; the item box clips it to the bleed the sheet has room
            // for (1.5 mm between home cards, B134).
            return item.elementKey === null ||
                item.side === undefined ? null : (
                <div
                    style={{
                        position: 'absolute',
                        left: mm(item.trim.x - BLEED - item.bleed.x),
                        top: mm(item.trim.y - BLEED - item.bleed.y),
                    }}
                >
                    <CardArt
                        ctx={ctx}
                        elementKey={item.elementKey}
                        side={item.side}
                        bleedMm={BLEED}
                    />
                </div>
            );
        case 'alignment':
            return (
                <AlignmentArt
                    side={item.side ?? 'front'}
                    locale={ctx.resolved.language}
                />
            );
        case 'note':
            return <NoteArt ctx={ctx} item={item} />;
        case 'token':
            return <PawnArt ctx={ctx} item={item} />;
        case 'box-lid':
            return <BoxLidArt ctx={ctx} item={item} />;
        case 'booklet-page':
            return <BookletArt ctx={ctx} item={item} />;
        case 'invitation':
            return <InvitationArt ctx={ctx} />;
        case 'calibration':
            return null;
    }
}

/**
 * One element of the edition drawn on its own, with the bleed it has in this set. Only used to measure the
 * photo frames (lib/print/photo-targets.ts): it draws the same renderers with the same bleed as `ItemArt`.
 */
export function ElementArt({
    ctx,
    elementKey,
}: {
    ctx: ArtContext;
    elementKey: string;
}): ReactNode {
    const parsed = parseKey(elementKey);
    const asItem = (kind: PageItem['kind']): PageItem => ({
        id: elementKey,
        kind,
        elementKey,
        label: elementKey,
        bleed: { x: 0, y: 0, w: 0, h: 0 },
        trim: { x: 0, y: 0, w: 0, h: 0 },
    });

    switch (parsed?.kind) {
        case 'space':
            return (
                <SpaceArt
                    ctx={ctx}
                    position={Number(elementKey.split('.')[1])}
                    bleedMm={ctx.set === 'home' ? STICKER_BLEED : 0}
                    frame={ctx.set !== 'home'}
                />
            );
        case 'deed':
        case 'card':
        case 'houseRules':
            return (
                <CardArt
                    ctx={ctx}
                    elementKey={elementKey}
                    side="front"
                    bleedMm={BLEED}
                />
            );
        case 'cardBack': {
            const deck = deckOf(elementKey);

            return deck === null ? null : (
                <CardArt
                    ctx={ctx}
                    elementKey={`card.${deck}.01`}
                    side="back"
                    bleedMm={BLEED}
                />
            );
        }
        case 'note':
            return <NoteArt ctx={ctx} item={asItem('note')} />;
        case 'pawn':
            return <PawnArt ctx={ctx} item={asItem('token')} />;
        case 'boxLid':
            return <BoxLidArt ctx={ctx} item={asItem('box-lid')} />;
        case 'boardCenter':
            // Without free layers: the first photo slot found is the one of the title.
            return (
                <BoardCenter
                    {...common(ctx, 0)}
                    editionName={centreName(ctx)}
                    profile={ctx.resolved.boardProfile}
                    title={centerTitleOf(
                        ctx.resolved.boardCenter,
                        photoOf(ctx, BOARD_CENTER_KEY),
                    )}
                />
            );
        case 'rulesBooklet':
            return (
                <BookletArt
                    ctx={ctx}
                    item={{ ...asItem('booklet-page'), id: 'booklet.1' }}
                />
            );
        case 'invitation':
            return <InvitationArt ctx={ctx} />;
        default:
            return null;
    }
}
