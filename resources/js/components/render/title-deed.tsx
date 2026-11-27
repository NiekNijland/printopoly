import type { PhotoSource } from '@/lib/render/photo';
import { partStyleOf } from '@/lib/render/style';
import { THEMES } from '@/lib/render/themes';
import type { OwnableSpace } from '@/types/game';

import { FreeLayers, type RenderLayer } from './free-layers';
import { CARD_SIZE_MM } from './game-card';
import { Sheet, type ElementProps } from './sheet';
import type { SpaceIconSource } from './space-icon';
import { DeedBack } from './title-deed-back';
import { DeedFront } from './title-deed-front';
import { blockColors } from './title-deed-parts';
import { styledDeedPaper } from './title-deed-styles';

export type TitleDeedProps = {
    space: OwnableSpace;
    side: 'front' | 'back';
    /** Replaces the name from the game data. */
    name?: string;
    /** Town of the colour group (streets only); shown small above the name. */
    town?: string;
    photo?: PhotoSource;
    /** The icon or image chosen for the station or utility on the board (B136). */
    icon?: SpaceIconSource;
    /** Free layers on the back, in mm from the top left of the card. */
    layers?: readonly RenderLayer[];
    /** A short story about the place, on the back under the mortgage (B169). */
    story?: string;
} & ElementProps;

/**
 * A title deed at 63 x 88 mm, built like the original (B133): a thin frame, a block in the group colour with
 * "EIGENDOMSBEWIJS" and the name, the rent rows, a rule and the building costs. The back holds the mortgage.
 */
export const TitleDeed = ({
    space,
    side,
    name,
    town,
    photo,
    icon,
    layers,
    story,
    ...element
}: TitleDeedProps) => {
    const { w, h } = { w: CARD_SIZE_MM.width, h: CARD_SIZE_MM.height };
    const theme = THEMES[element.theme];
    // A style of its own for the deeds (B269) brings its own paper, into the bleed.
    const deedStyle = partStyleOf(element.style, 'deeds');
    const background =
        deedStyle === undefined
            ? theme.deedPaper
            : styledDeedPaper(
                  theme,
                  deedStyle,
                  blockColors(space, theme, element.style).band,
                  space.type === 'street',
              );

    return (
        <Sheet
            {...element}
            element={`deed-${space.type}-${side}`}
            widthMm={w}
            heightMm={h}
            background={background}
            rounded
        >
            {side === 'front' ? (
                <DeedFront
                    space={space}
                    w={w}
                    h={h}
                    name={name}
                    town={town}
                    photo={photo}
                    icon={icon}
                    bleed={element.bleedMm ?? 0}
                />
            ) : (
                <DeedBack
                    space={space}
                    w={w}
                    h={h}
                    name={name}
                    town={town}
                    icon={icon}
                    story={story}
                    bleed={element.bleedMm ?? 0}
                />
            )}
            {side === 'back' && layers !== undefined && (
                <FreeLayers layers={layers} />
            )}
        </Sheet>
    );
};
