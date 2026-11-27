import type { ReactNode } from 'react';

import {
    layerBox,
    layerLook,
    type RenderLayer,
} from '@/components/render/free-layers';
import { SetMark } from '@/components/render/set-mark';
import { type SpaceIconSource } from '@/components/render/space-icon';
import { parseKey } from '@/lib/render/edition-keys';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import { isObject } from '@/lib/render/edition-schema-values';
import type { Edition, FreeLayer } from '@/lib/render/edition-types';
import type { PhotoSource } from '@/lib/render/photo';
import type { PageItem, PrintSet } from '@/lib/render/print-composition';
import { BLEED } from '@/lib/render/print-page-frame';
import { THEMES } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { AlignmentArt } from './print-alignment-art';
import { STICKER_BLEED, deckOf, type ArtKit } from './print-art-kit';
import {
    CentreTitleArt,
    HomeCentreArt,
    HomeSpaceArt,
    PanelArt,
    SpaceArt,
} from './print-board-art';
import { CardArt } from './print-card-art';
import {
    BookletArt,
    BoxLidArt,
    InvitationArt,
    NoteArt,
    PawnArt,
} from './print-sheet-art';

export type ArtContext = {
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
};

const printedSrc = (photo: unknown): string | undefined =>
    isObject(photo) && typeof photo.src === 'string' ? photo.src : undefined;

/**
 * The photo of an element as the renderers take it. In print this is the crop the server made for exactly
 * this frame (so no transform: the picture fills the frame), and nothing when the element has no photo or
 * the server dropped it.
 */
export const photoOf = (
    ctx: ArtContext,
    key: string,
    field: 'photo' | 'background' = 'photo',
): PhotoSource | undefined => {
    const override = ctx.edition.elements[key];
    const photo = override?.[field];
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

    const src = printedSrc(photo);

    return src === undefined ? undefined : { src, ...extra };
};

/**
 * The chosen icon of a special space (B136) as the renderers take it. An uploaded image is the crop the server
 * made (`icon.photo.src`); without that crop the standard icon is drawn.
 */
const iconOf = (ctx: ArtContext, key: string): SpaceIconSource | undefined => {
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

    const src = printedSrc(icon.photo);

    return src === undefined
        ? undefined
        : { photo: { src }, aspect: icon.aspect };
};

/**
 * Free layers of an element for the renderers. A photo layer carries its own frame (`w` and `h`), so the
 * server crops it to exactly that; a layer photo shows the crop as it is, without a transform.
 */
const layersOf = (
    ctx: ArtContext,
    layers: readonly FreeLayer[],
): RenderLayer[] => {
    return layers.map((layer): RenderLayer => {
        const box = layerBox(layer);

        if (layer.kind === 'text') {
            return {
                ...box,
                kind: 'text',
                text: layer.text,
                ...layerLook(layer),
            };
        }

        const src = printedSrc(layer.photo);

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
};

const artKitOf = (ctx: ArtContext): ArtKit => ({
    ctx,
    photo: (key, field) => photoOf(ctx, key, field),
    icon: (key) => iconOf(ctx, key),
    layers: (layers) => layersOf(ctx, layers),
});

/** The card frame lies 3 mm inside the cut edge; the set mark sits on it like a stamp (B242). */
const CARD_FRAME = 3;

/** On a banknote the mark sits on the inner border, under the oval with the value (NOTE_LAYOUT of banknote.tsx). */
const NOTE_MARK = { cx: 56.8, cy: 60 - 4.6 };

/**
 * Whether an item carries the set mark (B242): the back of every card (Chance, Community Chest, the house rules card
 * and the deeds), both sides of a title deed, and every banknote. Only when the PDF holds more than one set.
 */
const carriesSetMark = (item: PageItem): boolean => {
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
};

/** The set mark of an item, placed in the item box (its bleed box) on the frame of the card or the note. */
const SetMarkOf = ({ ctx, item }: { ctx: ArtContext; item: PageItem }) => {
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
};

/** What an item of a page shows: the real renderer of its element, at true size, with its set mark (B242). */
export const ItemArt = ({
    ctx,
    item,
}: {
    ctx: ArtContext;
    item: PageItem;
}): ReactNode => {
    return (
        <>
            <ItemBody ctx={ctx} item={item} />
            <SetMarkOf ctx={ctx} item={item} />
        </>
    );
};

const ItemBody = ({
    ctx,
    item,
}: {
    ctx: ArtContext;
    item: PageItem;
}): ReactNode => {
    const kit = artKitOf(ctx);

    switch (item.kind) {
        case 'panel':
            return <PanelArt kit={kit} item={item} />;
        case 'space':
            return <HomeSpaceArt kit={kit} item={item} />;
        case 'center':
            return <HomeCentreArt kit={kit} item={item} />;
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
                        kit={kit}
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
            return <NoteArt kit={kit} item={item} />;
        case 'token':
            return <PawnArt kit={kit} item={item} />;
        case 'box-lid':
            return <BoxLidArt kit={kit} item={item} />;
        case 'booklet-page':
            return <BookletArt kit={kit} item={item} />;
        case 'invitation':
            return <InvitationArt kit={kit} />;
        case 'calibration':
            return null;
    }
};

/**
 * One element of the edition drawn on its own, with the bleed it has in this set. Only used to measure the
 * photo frames (lib/render/print-photo-targets.ts): it draws the same renderers with the same bleed as `ItemArt`.
 */
export const ElementArt = ({
    ctx,
    elementKey,
}: {
    ctx: ArtContext;
    elementKey: string;
}): ReactNode => {
    const parsed = parseKey(elementKey);
    const asItem = (kind: PageItem['kind']): PageItem => ({
        id: elementKey,
        kind,
        elementKey,
        label: elementKey,
        bleed: { x: 0, y: 0, w: 0, h: 0 },
        trim: { x: 0, y: 0, w: 0, h: 0 },
    });

    const kit = artKitOf(ctx);

    switch (parsed?.kind) {
        case 'space':
            return (
                <SpaceArt
                    kit={kit}
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
                    kit={kit}
                    elementKey={elementKey}
                    side="front"
                    bleedMm={BLEED}
                />
            );
        case 'cardBack': {
            const deck = deckOf(elementKey);

            return deck === null ? null : (
                <CardArt
                    kit={kit}
                    elementKey={`card.${deck}.01`}
                    side="back"
                    bleedMm={BLEED}
                />
            );
        }
        case 'note':
            return <NoteArt kit={kit} item={asItem('note')} />;
        case 'pawn':
            return <PawnArt kit={kit} item={asItem('token')} />;
        case 'boxLid':
            return <BoxLidArt kit={kit} item={asItem('box-lid')} />;
        case 'boardCenter':
            // Without free layers: the first photo slot found is the one of the title.
            return <CentreTitleArt kit={kit} />;
        case 'rulesBooklet':
            return (
                <BookletArt
                    kit={kit}
                    item={{ ...asItem('booklet-page'), id: 'booklet.1' }}
                />
            );
        case 'invitation':
            return <InvitationArt kit={kit} />;
        case 'group':
        case 'partStyle':
        case 'themeAccent':
        case 'words':
        case undefined:
            return null;
    }
};
