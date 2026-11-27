import type { ReactNode } from 'react';

import { mix } from '@/lib/render/color';
import type { BoardStyle } from '@/lib/render/edition-part-styles';
import { mm } from '@/lib/render/units';

import { TILE_GAP, TILE_RADIUS, ruleColor } from './board-look';
import { PlayfulTile } from './board-look-playful';
import { VintageRules } from './board-look-vintage';
import { useRender } from './sheet';

export const PlayfulPhotoTile = ({
    w,
    h,
    ink,
    seed,
    children,
}: {
    w: number;
    h: number;
    ink: string;
    seed: number;
    children: ReactNode;
}) => {
    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    left: mm(TILE_GAP),
                    top: mm(TILE_GAP),
                    width: mm(w - 2 * TILE_GAP),
                    height: mm(h - 2 * TILE_GAP),
                    borderRadius: mm(TILE_RADIUS),
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        left: mm(-TILE_GAP),
                        top: mm(-TILE_GAP),
                        width: mm(w),
                        height: mm(h),
                    }}
                >
                    {children}
                </div>
            </div>
            <PlayfulTile w={w} h={h} fill="none" ink={ink} seed={seed} />
        </>
    );
};

export const SpaceUnderlay = ({
    look,
    w,
    h,
    background,
    position,
    corner,
    full,
}: {
    look: BoardStyle | undefined;
    w: number;
    h: number;
    background: string;
    position: number;
    corner: boolean;
    full: boolean;
}) => {
    const { theme } = useRender();

    return (
        <>
            {look === 'playful' && (
                <PlayfulTile
                    w={w}
                    h={h}
                    fill={
                        background === theme.boardBackground
                            ? mix(theme.paper, background, 0.25)
                            : background
                    }
                    ink={theme.ink}
                    seed={position + 1}
                />
            )}
            {look === 'vintage' && !full && (
                <VintageRules
                    w={w}
                    h={h}
                    color={ruleColor(theme)}
                    ornaments={corner}
                />
            )}
        </>
    );
};
