import type { ReactNode } from 'react';

import { Board, BoardCenter, centerTitleOf } from '@/components/render/board';
import { boardPropsOf } from '@/components/render/board-props';
import { BoardSpace, spaceSize } from '@/components/render/board-space';
import { CENTER_PHOTO_BLEED } from '@/lib/render/center-layout';
import { BOARD_CENTER_KEY } from '@/lib/render/edition-keys';
import { centerRect, spaceRects } from '@/lib/render/print-board';
import type { PageItem } from '@/lib/render/print-composition';
import { stickerPieces } from '@/lib/render/print-home-stickers';
import { BLEED } from '@/lib/render/print-page-frame';
import { splitPanels } from '@/lib/render/print-panels';
import { spaceAt } from '@/lib/render/standard-edition';
import { THEMES } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import {
    STICKER_BLEED,
    centreName,
    common,
    printSources,
    type ArtKit,
} from './print-art-kit';

/** One space of the board drawn upright, with the bleed given (0 on the board, 2.5 on a home sticker). */
export const SpaceArt = ({
    kit,
    position,
    bleedMm,
    frame,
}: {
    kit: ArtKit;
    position: number;
    bleedMm: number;
    frame: boolean;
}) => {
    const { ctx } = kit;
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
            photo={kit.photo(space.key)}
            icon={kit.icon(space.key)}
            frame={frame}
        />
    );
};

const FullBoard = ({ kit }: { kit: ArtKit }) => {
    return (
        <Board
            {...boardPropsOf(kit.ctx.resolved, printSources(kit))}
            bleedMm={0}
        />
    );
};

/** A window onto a bigger piece of artwork: `source` is the part to show, in the artwork's own mm. */
export const Window = ({
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
}) => {
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
};

/** Artwork of a given (unrotated) size, turned a number of degrees around its centre inside `box`. */
const Turned = ({
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
}) => {
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
};

export const PanelArt = ({ kit, item }: { kit: ArtKit; item: PageItem }) => {
    const { ctx } = kit;
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
                <FullBoard kit={kit} />
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
            <FullBoard kit={kit} />
        </Window>
    );
};

export const HomeSpaceArt = ({
    kit,
    item,
}: {
    kit: ArtKit;
    item: PageItem;
}) => {
    const { ctx } = kit;
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
                kit={kit}
                position={position}
                bleedMm={STICKER_BLEED}
                frame={false}
            />
        </Turned>
    );
};

export const HomeCentreArt = ({
    kit,
    item,
}: {
    kit: ArtKit;
    item: PageItem;
}) => {
    const { ctx } = kit;
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
                    layers={kit.layers(ctx.resolved.boardCenter.layers)}
                    title={centerTitleOf(
                        ctx.resolved.boardCenter,
                        kit.photo(BOARD_CENTER_KEY),
                        kit.photo(BOARD_CENTER_KEY, 'background'),
                    )}
                />
            </Window>
        </Turned>
    );
};

export const CentreTitleArt = ({ kit }: { kit: ArtKit }) => {
    const { ctx } = kit;

    return (
        <BoardCenter
            {...common(ctx, 0)}
            editionName={centreName(ctx)}
            profile={ctx.resolved.boardProfile}
            title={centerTitleOf(
                ctx.resolved.boardCenter,
                kit.photo(BOARD_CENTER_KEY),
            )}
        />
    );
};
