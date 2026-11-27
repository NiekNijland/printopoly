import { mix } from '@/lib/render/color';
import type { PhotoSource } from '@/lib/render/photo';
import type { Layout } from '@/lib/render/themes';
import type { CornerSpace } from '@/types/game';

import { Confetti, QuarterDisc, useBoardLook } from './board-look';
import { JailCorner } from './corner-jail';
import { PictureCorner } from './corner-picture';
import { StartCorner } from './corner-start';
import { useRender } from './sheet';
import { type SpaceIconSource } from './space-icon';

export type CornerContentProps = {
    space: CornerSpace;
    /** Side of the square corner in mm. */
    size: number;
    name: string;
    text?: string;
    layout: Layout;
    photo?: PhotoSource;
    icon?: SpaceIconSource;
    money: (amount: number) => string;
};

/**
 * The four corners, after the build of the classic board but in our own drawings (B87): the text on the 45°
 * diagonal, a picture in the middle, Start with its long arrow along the edge and the jail with its cell in the
 * inner point and "op bezoek" as an L along the outer edges. Drawn upright in the frame of Start (inner point top
 * left); the board turns each corner into its place (see `cornerRotation`).
 */
export const CornerContent = (props: CornerContentProps) => {
    return (
        <>
            <CornerDecoration {...props} />
            {props.space.corner === 'start' ? (
                <StartCorner {...props} />
            ) : props.space.corner === 'jail' ? (
                <JailCorner {...props} />
            ) : (
                <PictureCorner {...props} />
            )}
        </>
    );
};

/**
 * What a board style (B268) adds under a corner: Modern a flat quarter disc in the outer corner, Speels some
 * confetti in the free corners. The jail keeps its cell; Vintage draws its rules with the space (board-space.tsx).
 */
const CornerDecoration = ({ space, size: c }: CornerContentProps) => {
    const { theme } = useRender();
    const { style } = useBoardLook();

    if (space.corner === 'jail') {
        return null;
    }
    if (style === 'modern') {
        return (
            <QuarterDisc
                size={c}
                radius={c * 0.58}
                color={mix(theme.paper, theme.secondaryAccent, 0.2)}
            />
        );
    }
    if (style === 'playful') {
        return (
            <Confetti
                size={c}
                colors={[
                    theme.secondaryAccent,
                    theme.deckAccent.chance,
                    theme.deckAccent.chest,
                ]}
                seed={space.position}
                outer={space.corner !== 'start'}
            />
        );
    }

    return null;
};
