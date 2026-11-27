import type { LidLayout, LidPhoto } from '@/lib/render/box-lid-layout';
import { mix } from '@/lib/render/color';
import type { BoxLidStyle } from '@/lib/render/edition-part-styles';
import type { TitleStyle } from '@/lib/render/edition-types';
import type { PhotoSource } from '@/lib/render/photo';
import type { BoardProfile } from '@/lib/render/print-board';
import { mm } from '@/lib/render/units';
import type { Rect } from '@/types/print';

import { ScaledBoard, type BoardProps } from './board';
import { vintageLid } from './box-lid-colors';
import { LidBackground, LidFrame, LidStrip } from './box-lid-look';
import { OffsetBlock } from './box-lid-look-modern';
import { LidConfetti, TapeCorners } from './box-lid-look-playful';
import { LidLines, type LidWords } from './box-lid-text';
import { EditionTitle, titleFontOf } from './edition-title';
import { PhotoSlot } from './photo-slot';
import { Abs, useRender } from './sheet';

export const PictureLid = ({
    w,
    h,
    bleed,
    look,
    picture,
    layout,
    words,
    editionName,
    titleStyle,
    mode,
    photo,
    board,
    profile,
    boardPicture,
}: {
    w: number;
    h: number;
    bleed: number;
    look: BoxLidStyle | undefined;
    picture: Rect;
    layout: LidLayout;
    words: LidWords;
    editionName: string;
    titleStyle?: TitleStyle;
    mode: LidPhoto;
    photo?: PhotoSource;
    board?: BoardProps;
    profile: BoardProfile;
    boardPicture: boolean;
}) => {
    return (
        <>
            <LidBackground look={look} w={w} h={h} bleed={bleed} />
            <LidFrame look={look} w={w} h={h} bleed={bleed} />
            {look === 'playful' && (
                <LidConfetti picture={picture} w={w} h={h} />
            )}
            <LidPlate
                title={layout.title}
                editionName={editionName}
                titleStyle={titleStyle}
            />
            {!boardPicture ? null : mode === 'logo' ? (
                /* The logo of the board centre, whole and straight in the place of the board (B241). */
                <PhotoSlot {...picture} photo={photo} />
            ) : (
                <LidBoardPicture
                    look={look}
                    picture={picture}
                    editionName={editionName}
                    board={board}
                    profile={profile}
                />
            )}
            <LidLines layout={layout} look={look} words={words} />
            {layout.strip !== undefined && (
                <LidStrip
                    look={look}
                    rect={layout.strip}
                    w={w}
                    h={h}
                    bleed={bleed}
                />
            )}
        </>
    );
};

const LidBoardPicture = ({
    look,
    picture,
    editionName,
    board,
    profile,
}: {
    look: BoxLidStyle | undefined;
    picture: Rect;
    editionName: string;
    board?: BoardProps;
    profile: BoardProfile;
}) => {
    const { theme } = useRender();
    const turn = look === 'modern' ? 0 : -3;

    return (
        <>
            {look === 'modern' ? (
                /* Modern: the board straight on a flat block in the strong colour of the theme. */
                <OffsetBlock rect={picture} />
            ) : (
                /* A flat shadow in a darker tone of the lid: print colours, no blur (B87). */
                <Abs
                    x={picture.x + picture.w * 0.025}
                    y={picture.y + picture.w * 0.03}
                    w={picture.w}
                    h={picture.h}
                    style={{
                        background: mix(
                            theme.ink,
                            look === 'vintage'
                                ? vintageLid(theme)
                                : theme.boardBackground,
                            0.86,
                        ),
                        transform: `rotate(${String(turn)}deg)`,
                    }}
                />
            )}
            <TiltedBoard
                picture={picture}
                turn={turn}
                editionName={editionName}
                board={board}
                profile={profile}
            />
            {look === 'playful' && (
                <Abs
                    {...picture}
                    style={{
                        transform: `rotate(${String(turn)}deg)`,
                    }}
                >
                    <TapeCorners w={picture.w} h={picture.h} />
                </Abs>
            )}
        </>
    );
};

const TiltedBoard = ({
    picture,
    turn,
    editionName,
    board,
    profile,
}: {
    picture: Rect;
    turn: number;
    editionName: string;
    board?: BoardProps;
    profile: BoardProfile;
}) => {
    const { theme } = useRender();
    const boardProfile = board?.profile ?? profile;

    return (
        <Abs
            x={picture.x}
            y={picture.y}
            w={picture.w}
            h={picture.h}
            style={{
                transform: `rotate(${String(turn)}deg)`,
                overflow: 'hidden',
                boxShadow: `0 0 0 ${mm(0.4)} ${theme.ink}`,
            }}
            slot="lid-board"
        >
            <ScaledBoard
                size={picture.w}
                profile={boardProfile}
                board={board}
                editionName={editionName}
            />
        </Abs>
    );
};

const LidPlate = ({
    title,
    editionName,
    titleStyle,
}: {
    title: Rect;
    editionName: string;
    titleStyle?: TitleStyle;
}) => {
    const { theme } = useRender();
    // The plate of the board centre, at the size of the title area: 1 is a plate on the standard 360 mm centre.
    const unit = title.h / (40 * titleFontOf(titleStyle, theme).scale + 6);
    const plateInset = 16 * unit;

    return (
        <>
            {/* The ribbon ends of Klassiek and the tilt stay inside the frame. */}
            <Abs
                x={title.x + plateInset}
                y={title.y}
                w={title.w - 2 * plateInset}
                h={title.h}
                slot="lid-plate"
            >
                <EditionTitle
                    name={editionName}
                    tagline={undefined}
                    mode="name"
                    photo={undefined}
                    photoAspect={undefined}
                    photoRotation={0}
                    photoFrame={false}
                    w={title.w - 2 * plateInset}
                    h={title.h}
                    unit={unit}
                    titleStyle={titleStyle}
                />
            </Abs>
        </>
    );
};
