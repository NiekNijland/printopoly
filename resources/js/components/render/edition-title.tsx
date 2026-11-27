import type { CenterMode, TitleStyle } from '@/lib/render/edition-types';
import type { PhotoSource } from '@/lib/render/photo';
import type { Theme, ThemeId } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { PlainTitle } from './edition-title-plain';
import { PlateTitle } from './edition-title-plate';
import { ScriptTitle } from './edition-title-script';
import { scaleToFit, turnedAspect } from './edition-title-shared';
import { StampTitle } from './edition-title-stamp';
import { PhotoSlot } from './photo-slot';
import { useRender } from './sheet';

export type PlateLook = {
    fill: string;
    flap: string | undefined;
    text: string;
    shadow: string | undefined;
    pillFill: string;
    pillText: string;
    pillStroke: string;
    back: string | undefined;
    tilt: number;
    /** The outline of the plate; the ink of the theme when absent. */
    edge?: string;
    /** Width of the outline compared with the standard 1.7 mm. */
    edgeScale?: number;
    /** The thin inner line; the text colour at half strength when absent. */
    inner?: string;
    /** Corner radius in mm on the standard centre. */
    radius: number;
    /** The tagline in the heading font of the theme, instead of League Spartan. */
    tagInHeading?: boolean;
};

/** Colours of the plate per theme (B125). Flat print colours, no gradients (B87). */
const PLATE: Record<ThemeId, PlateLook> = {
    classic: {
        fill: '#FFD84D',
        flap: '#E3B52A',
        text: '#1B1F24',
        shadow: undefined,
        pillFill: '#1B1F24',
        pillText: '#FFFDF7',
        pillStroke: '#1B1F24',
        back: undefined,
        tilt: -2.5,
        radius: 2.2,
    },
    riso: {
        fill: '#E6007E',
        flap: undefined,
        text: '#FFFDF7',
        shadow: '#1B1F24',
        pillFill: '#00A3E0',
        pillText: '#1B1F24',
        pillStroke: '#1B1F24',
        back: '#00A3E0',
        tilt: 2,
        inner: '#FFFDF7',
        radius: 2.2,
    },
    strak: {
        fill: '#1B1F24',
        flap: undefined,
        text: '#FFFFFF',
        shadow: undefined,
        pillFill: '#FFFFFF',
        pillText: '#1B1F24',
        pillStroke: '#1B1F24',
        back: undefined,
        tilt: 0,
        radius: 0,
    },
    // Gala (B247): an ivory place card on a champagne one, straight, with a thin gold edge and a gold inner line.
    gala: {
        fill: '#FFFCF5',
        flap: undefined,
        text: '#2B2621',
        shadow: undefined,
        pillFill: '#FFFCF5',
        pillText: '#8C6A22',
        pillStroke: '#8C6A22',
        back: '#EFE3CC',
        tilt: 0,
        edge: '#8C6A22',
        edgeScale: 0.45,
        inner: '#B8923F',
        radius: 1.2,
        tagInHeading: true,
    },
};

/**
 * "Lint" (Niek, 22 nov): the ribbon of Klassiek with its folded ends and tilt, in the inks of each theme. On Klassiek it
 * is the plate of the theme itself.
 */
const RIBBON: Record<ThemeId, PlateLook> = {
    classic: PLATE.classic,
    riso: {
        fill: '#E6007E',
        flap: '#00A3E0',
        text: '#FFFDF7',
        shadow: undefined,
        pillFill: '#00A3E0',
        pillText: '#1B1F24',
        pillStroke: '#1B1F24',
        back: undefined,
        tilt: -2.5,
        inner: '#FFFDF7',
        radius: 2.2,
    },
    strak: {
        fill: '#1B1F24',
        flap: '#4A4F57',
        text: '#FFFFFF',
        shadow: undefined,
        pillFill: '#FFFFFF',
        pillText: '#1B1F24',
        pillStroke: '#1B1F24',
        back: undefined,
        tilt: -2.5,
        radius: 2.2,
    },
    gala: {
        fill: '#EFE3CC',
        flap: '#D9C7A3',
        text: '#2B2621',
        shadow: undefined,
        pillFill: '#FFFCF5',
        pillText: '#8C6A22',
        pillStroke: '#8C6A22',
        back: undefined,
        tilt: -2.5,
        edge: '#8C6A22',
        edgeScale: 0.45,
        inner: '#B8923F',
        radius: 1.2,
        tagInHeading: true,
    },
};

/**
 * The strong ink of each theme, for the bar, the stamp and the script (Niek, 22 nov): the red of Klassiek, the
 * magenta of Riso, the black of Strak and the gold of Gala, with the paper on top of it. Light text on these is at
 * least 4.4 : 1, for large letters only (B247).
 */
const MARK: Record<ThemeId, { ink: string; on: string }> = {
    classic: { ink: '#C8321F', on: '#FFFDF7' },
    riso: { ink: '#E6007E', on: '#FFFDF7' },
    strak: { ink: '#1B1F24', on: '#FFFFFF' },
    gala: { ink: '#8C6A22', on: '#FFFCF5' },
};

/** "Balk": a straight block in the strong ink with an ink edge and a light inner line, like the title of the game. */
const barLook = (theme: Theme): PlateLook => {
    const mark = MARK[theme.id];

    return {
        fill: mark.ink,
        flap: undefined,
        text: mark.on,
        shadow: undefined,
        pillFill: theme.paper,
        pillText: theme.ink,
        pillStroke: theme.ink,
        back: undefined,
        tilt: 0,
        edge: theme.ink,
        inner: mark.on,
        radius: 0,
        tagInHeading: true,
    };
};

/** The plate of a style that has one (the theme, Lint, Balk), also for the small pictures in the editor. */
export const plateLookOf = (
    style: TitleStyle | undefined,
    theme: Theme,
): PlateLook => {
    return style === 'ribbon'
        ? RIBBON[theme.id]
        : style === 'bar'
          ? barLook(theme)
          : PLATE[theme.id];
};

/** The strong ink of a theme for the stamp and the script. */
export const titleMarkOf = (theme: Theme): string => {
    return MARK[theme.id].ink;
};

const GREAT_VIBES = "'Great Vibes', 'Playfair Display', cursive";

/** The font of the name in a title style. */
export type NameFont = {
    family: string;
    weight: number;
    /** How much larger than League Spartan the name may grow: a script has small letters for its size. */
    scale: number;
    upper: boolean;
};

/** The font of the name per style: the title font of the theme, or a font of the style itself. */
export const titleFontOf = (
    style: TitleStyle | undefined,
    theme: Theme,
): NameFont => {
    switch (style) {
        case 'bar':
        case 'stamp':
            return {
                family: theme.headingFont,
                weight: theme.headingWeight,
                scale: 1,
                upper: true,
            };
        case 'script':
            return {
                family: GREAT_VIBES,
                weight: 400,
                scale: 1.5,
                upper: false,
            };
        case 'ribbon':
        case 'plain':
        case undefined:
            return {
                family: theme.titleFont,
                weight: theme.titleWeight,
                scale: theme.titleScale,
                upper: false,
            };
    }
};

export type EditionTitleProps = {
    name: string;
    /** The line under the name; `undefined` leaves it out. */
    tagline: string | undefined;
    mode: CenterMode;
    photo: PhotoSource | undefined;
    /** Width over height of the photo as uploaded. */
    photoAspect: number | undefined;
    /** Quarter turns of the placement: a turned photo swaps its aspect ratio. */
    photoRotation: number;
    photoFrame: boolean;
    /** The free area on the diagonal in mm, with its middle at the middle of the centre. */
    w: number;
    h: number;
    /** 1 on the standard 360 mm centre; the sizes below scale with the board. */
    unit: number;
    /** The look of the name (Niek, 22 nov); `undefined` is the plate of the theme. */
    titleStyle?: TitleStyle;
};

/**
 * The edition title in the middle of the board (B125): the name on a tilted plate in the colours of the
 * theme, an optional photo standing on the plate, or a logo instead of the name. Drawn in the frame of the
 * diagonal (left to right along the diagonal), so the caller rotates it.
 */
export const EditionTitle = (props: EditionTitleProps) => {
    // A logo is drawn by the centre itself (B187): straight or on the diagonal, in its own place.
    const withPhoto = props.mode === 'photo' && props.photo !== undefined;
    const { theme } = useRender();
    const title = {
        ...props,
        withPhoto,
        look: plateLookOf(props.titleStyle, theme),
        font: titleFontOf(props.titleStyle, theme),
        mark: titleMarkOf(theme),
        photoOnTitle: (top: number, tilt: number) => (
            <PhotoOnTitle props={props} top={top} tilt={tilt} />
        ),
    };

    switch (props.titleStyle) {
        case 'stamp':
            return <StampTitle {...title} />;
        case 'script':
            return <ScriptTitle {...title} />;
        case 'plain':
            return <PlainTitle {...title} />;
        case 'bar':
        case 'ribbon':
        case undefined:
            return <PlateTitle {...title} />;
    }
};

/** The paper around a framed photo, in mm per side, on a full ribbon (`unit` 1). */
export const FRAME_INSET = 2.4;

/**
 * The photo of "Naam met foto" (B125): in a paper frame with an ink edge, a little askew like a photo laid on the
 * board, or without a frame for a cut-out PNG. `x`, `y`, `w` and `h` are the photo itself; the frame lies around it.
 */
export const FramedPhoto = ({
    x,
    y,
    w,
    h,
    photo,
    frame,
    inset,
    unit,
    tilt,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    photo: PhotoSource | undefined;
    frame: boolean;
    inset: number;
    unit: number;
    /** The tilt of the plate of the theme; the frame leans the other way. */
    tilt: number;
}) => {
    const { theme } = useRender();

    return (
        <div
            style={{
                position: 'absolute',
                left: mm(x - inset),
                top: mm(y - inset),
                width: mm(w + 2 * inset),
                height: mm(h + 2 * inset),
                boxSizing: 'border-box',
                background: frame ? '#FFFDF7' : undefined,
                border: frame
                    ? `${mm(1.3 * unit)} solid ${theme.ink}`
                    : undefined,
                borderRadius: frame ? mm(1.5 * unit) : undefined,
                transform:
                    frame && tilt !== 0
                        ? `rotate(${-tilt * 1.3}deg)`
                        : undefined,
                transformOrigin: 'center bottom',
            }}
            data-slot="edition-photo"
        >
            <PhotoSlot x={0} y={0} w={w} h={h} photo={photo} />
        </div>
    );
};

/**
 * The photo of "Naam met foto" over the middle, standing on a title that is no plate (Niek, 22 nov): the same size as
 * on the plate, with its foot `top` mm from the top of the title area.
 */
const PhotoOnTitle = ({
    props,
    top,
    tilt,
}: {
    props: EditionTitleProps;
    top: number;
    tilt: number;
}) => {
    const { photo, photoAspect, photoRotation, photoFrame, w, unit } = props;
    const aspect = turnedAspect(photoAspect ?? 4 / 3, photoRotation);
    const inset = photoFrame ? FRAME_INSET * unit : 0;
    const box = scaleToFit(aspect, 150 * unit, 62 * unit);

    return (
        <FramedPhoto
            x={(w - box.w) / 2}
            y={top - box.h - inset}
            w={box.w}
            h={box.h}
            photo={photo}
            frame={photoFrame}
            inset={inset}
            unit={unit}
            tilt={tilt}
        />
    );
};
