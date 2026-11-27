import type { ReactNode } from 'react';

import { mm } from '@/lib/render/units';

import { TILE_GAP, TILE_RADIUS } from './board-look';
import { PlayfulTile } from './board-look-playful';

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
