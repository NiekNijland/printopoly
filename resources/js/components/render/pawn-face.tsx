import { withAlpha } from '@/lib/render/color';
import type { PhotoSource } from '@/lib/render/photo';
import { partStyleOf } from '@/lib/render/style';
import { mm } from '@/lib/render/units';

import { ruleColor } from './board-look';
import { FitText } from './fit-text';
import { Initial } from './pawn-initial';
import {
    PANEL_HEIGHT,
    PAWN_NAME_MAX_MM,
    PAWN_WIDTH,
    nameBoxOf,
} from './pawn-layout';
import { NameDecor } from './pawn-name';
import { PanelBackdrop, Portrait, VintagePanelRules } from './pawn-panel';
import { BAND_OPACITY, PhotoSlot, isFullPhoto } from './photo-slot';
import { blockColor, pieceText, seedOf, vintagePaper } from './piece-styles';
import { Abs, useRender } from './sheet';

const PawnFullFace = ({
    name,
    photo,
}: {
    name: string;
    photo: PhotoSource;
}) => {
    const w = PAWN_WIDTH;
    const { theme, style } = useRender();
    const look = partStyleOf(style, 'pawns');
    const text = pieceText(look, 'name');
    const bandHeight = 8;
    const playful = look === 'playful';

    return (
        <>
            <PhotoSlot x={0} y={0} w={w} h={PANEL_HEIGHT} photo={photo} />
            {look === 'vintage' && (
                <VintagePanelRules color={theme.paper} split={false} />
            )}
            <Abs
                x={playful ? 2 : 0}
                y={PANEL_HEIGHT - bandHeight - (playful ? 1.2 : 0)}
                w={playful ? w - 4 : w}
                h={bandHeight}
                style={{
                    background: withAlpha(
                        look === 'vintage'
                            ? vintagePaper(theme.paper)
                            : theme.paper,
                        BAND_OPACITY,
                    ),
                    ...(playful
                        ? {
                              borderRadius: mm(bandHeight / 2),
                              border: `${mm(0.35)} solid ${theme.ink}`,
                              boxSizing: 'border-box',
                          }
                        : {}),
                    ...(look === 'modern'
                        ? {
                              borderTop: `${mm(1.2)} solid ${blockColor(theme)}`,
                              boxSizing: 'border-box',
                          }
                        : {}),
                    ...(look === 'vintage'
                        ? {
                              borderTop: `${mm(0.7)} double ${ruleColor(theme)}`,
                              boxSizing: 'border-box',
                          }
                        : {}),
                }}
                slot="name-band"
            />
            <FitText
                text={name}
                x={playful ? 5 : 3}
                y={
                    PANEL_HEIGHT -
                    bandHeight +
                    0.6 -
                    (playful ? 1.2 : 0) +
                    (look === 'modern' ? 0.6 : 0)
                }
                w={playful ? w - 10 : w - 6}
                h={bandHeight - 1.2 - (look === 'modern' ? 0.6 : 0)}
                maxFontMm={PAWN_NAME_MAX_MM}
                minFontMm={2}
                font="heading"
                {...text}
                align="center"
                valign="middle"
                slot="name"
            />
        </>
    );
};

export const PawnFace = ({
    name,
    photo,
}: {
    name: string;
    photo?: PhotoSource;
}) => {
    const w = PAWN_WIDTH;
    const { style } = useRender();
    const look = partStyleOf(style, 'pawns');
    const text = pieceText(look, 'name');
    const seed = seedOf(name);

    // "Full": the photo fills the whole panel and the name sits on a light band at its foot (B124).
    if (photo !== undefined && isFullPhoto(photo)) {
        return <PawnFullFace name={name} photo={photo} />;
    }

    const box = nameBoxOf(look);
    const name_ = (
        <FitText
            text={name}
            {...box}
            maxFontMm={PAWN_NAME_MAX_MM}
            minFontMm={2}
            wrap="words"
            font="heading"
            {...text}
            align={look === 'modern' ? 'left' : 'center'}
            valign={look === 'modern' ? 'bottom' : 'middle'}
            lineHeight={look === 'modern' ? 0.95 : undefined}
            slot="name"
        />
    );

    return (
        <>
            <PanelBackdrop look={look} seed={seed} />
            {photo === undefined ? (
                <Initial name={name} look={look} />
            ) : (
                <Portrait photo={photo} look={look} />
            )}
            <NameDecor look={look} seed={seed} />
            {look === 'playful' ? (
                /* Speels: the name a little turned, as if written on the tile. */
                <Abs
                    x={0}
                    y={0}
                    w={w}
                    h={PANEL_HEIGHT}
                    style={{
                        transform: 'rotate(-3deg)',
                        transformOrigin: `${mm(box.x + box.w / 2)} ${mm(box.y + box.h / 2)}`,
                    }}
                >
                    {name_}
                </Abs>
            ) : (
                name_
            )}
        </>
    );
};
