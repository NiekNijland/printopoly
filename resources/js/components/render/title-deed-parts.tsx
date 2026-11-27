import { readableOn } from '@/lib/render/color';
import type { DeedStyle } from '@/lib/render/edition-part-styles';
import { bestTextOn } from '@/lib/render/gamut';
import { standardEdition } from '@/lib/render/standard-edition';
import type { Theme } from '@/lib/render/themes';
import type { GroupId, OwnableSpace } from '@/types/game';

import { FitText } from './fit-text';
import { Abs, Frame, useRender } from './sheet';
import { StyledDeedFrame } from './title-deed-styles';
import { StyledDeedHeader } from './title-deed-styles-header';

/** Inset of the thin frame from the trim edge, and of the coloured block from the trim edge (B133). */
export const FRAME = 3;
export const BLOCK = 4.5;
export const BLOCK_HEIGHT = 16.5;
/** Where the rule under the rent table of a street sits, and the height of a cost row below it. */
export const RULE_Y = 66.5;
/**
 * With a photo the rule sits lower, in the room under the costs, so the taller photo (R5-05) leaves the rent rows
 * as large as before.
 */
export const RULE_Y_PHOTO = 70.5;
export const COST_ROW = 5;
/**
 * The hand-drawn edges of Speels are the same on every deed, so a print sheet holds each of them once as a picture
 * (B269).
 */
export const DEED_SEED = 3;

const bandColor = (
    space: OwnableSpace,
    theme: Theme,
    groupColors?: Partial<Record<GroupId, string>>,
): string => {
    if (space.type === 'street') {
        return (
            groupColors?.[space.group] ??
            theme.groupColors?.[space.group] ??
            standardEdition.groups.find((group) => group.id === space.group)
                ?.color ??
            theme.ink
        );
    }

    return theme.ink;
};

/** Whether the edition gave this street's group a colour of its own. */
const isOwnGroupColor = (
    space: OwnableSpace,
    style: { groupColors?: Partial<Record<GroupId, string>> },
): boolean => {
    return (
        space.type === 'street' &&
        style.groupColors?.[space.group] !== undefined
    );
};

/** The town to print on a deed: only streets have one, and an empty text is none. */
export const townLabel = (space: OwnableSpace, town: string | undefined) => {
    const text = space.type === 'street' ? town?.trim() : undefined;

    return text === undefined || text === '' ? undefined : text;
};

export const iconOf = (
    space: OwnableSpace,
): 'train' | 'bulb' | 'tap' | null => {
    if (space.type === 'station') {
        return 'train';
    }

    if (space.type === 'utility') {
        return space.position === 12 ? 'bulb' : 'tap';
    }

    return null;
};

/** The colour of the block and the text on it: the group colour for streets, the paper for the others. */
export const blockColors = (
    space: OwnableSpace,
    theme: Theme,
    style: { groupColors?: Partial<Record<GroupId, string>> } | undefined,
): { band: string; onBand: string } => {
    const band =
        space.type === 'street'
            ? bandColor(space, theme, style?.groupColors)
            : theme.deedPaper;
    const onBand =
        style?.groupColors !== undefined && isOwnGroupColor(space, style)
            ? bestTextOn(band)
            : readableOn(band);

    return { band, onBand };
};

/** The frame of a deed: the theme's thin frame, or the frame of the deed style (B269). */
export const DeedFrame = ({
    deedStyle,
    w,
    h,
    seed,
}: {
    deedStyle: DeedStyle | undefined;
    w: number;
    h: number;
    seed: number;
}) => {
    const { theme } = useRender();

    return deedStyle === undefined ? (
        <Frame
            ornate
            x={FRAME}
            y={FRAME}
            w={w - 2 * FRAME}
            h={h - 2 * FRAME}
            color={theme.deedFrame}
            strokeMm={theme.deedFrameMm}
        />
    ) : (
        <StyledDeedFrame style={deedStyle} w={w} h={h} seed={seed} />
    );
};

type DeedHeaderProps = {
    w: number;
    label: string;
    title: string;
    townText: string | undefined;
    band: string;
    /** The colour the band is painted with when it differs from `band` (translucent over a full photo). */
    bandBackground?: string;
    onBand: string;
    outline: string;
};

/** The block at the top of both sides: "EIGENDOMSBEWIJS" small, the town if any, and the name in capitals. */
const DeedHeader = ({
    w,
    label,
    title,
    townText,
    band,
    bandBackground = band,
    onBand,
    outline,
}: DeedHeaderProps) => {
    const hasTown = townText !== undefined;

    return (
        <>
            <Abs
                x={BLOCK}
                y={BLOCK}
                w={w - 2 * BLOCK}
                h={BLOCK_HEIGHT}
                style={{
                    background: bandBackground,
                    boxSizing: 'border-box',
                    border: `0.25mm solid ${outline}`,
                }}
                slot="band"
            />
            <FitText
                text={label.toUpperCase()}
                x={BLOCK + 2}
                y={BLOCK + 1.6}
                w={w - 2 * BLOCK - 4}
                h={3.2}
                maxFontMm={2.3}
                minFontMm={1.6}
                font="body"
                weight={600}
                color={onBand}
                align="center"
                slot="label"
            />
            {hasTown && (
                <FitText
                    text={townText}
                    x={BLOCK + 2}
                    y={BLOCK + 4.6}
                    w={w - 2 * BLOCK - 4}
                    h={3}
                    maxFontMm={2.4}
                    minFontMm={1.6}
                    font="body"
                    color={onBand}
                    align="center"
                    slot="town"
                />
            )}
            <FitText
                text={title.toUpperCase()}
                x={BLOCK + 2}
                y={BLOCK + (hasTown ? 7.6 : 5.2)}
                w={w - 2 * BLOCK - 4}
                h={hasTown ? 8 : 10}
                maxFontMm={4.8}
                minFontMm={2.2}
                wrap="words"
                font="heading"
                weight={700}
                color={onBand}
                align="center"
                lineHeight={1.05}
                slot="name"
            />
        </>
    );
};

export const DeedBlock = ({
    deedStyle,
    w,
    label,
    title,
    townText,
    band,
    onBand,
    street,
    bleed,
    seed,
}: {
    deedStyle: DeedStyle | undefined;
    w: number;
    label: string;
    title: string;
    townText: string | undefined;
    band: string;
    onBand: string;
    street: boolean;
    bleed: number;
    seed: number;
}) => {
    const { theme } = useRender();

    return deedStyle === undefined ? (
        <DeedHeader
            w={w}
            label={label}
            title={title}
            townText={townText}
            band={band}
            onBand={onBand}
            outline={theme.deedFrame}
        />
    ) : (
        <StyledDeedHeader
            style={deedStyle}
            w={w}
            block={BLOCK}
            blockHeight={BLOCK_HEIGHT}
            label={label}
            title={title}
            townText={townText}
            band={band}
            onBand={onBand}
            street={street}
            bleed={bleed}
            seed={seed}
        />
    );
};
