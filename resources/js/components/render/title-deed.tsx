import { standardEdition } from '@/lib/game/standard-edition';
import type { GroupId, OwnableSpace } from '@/lib/game/types';
import { readableOn, withAlpha } from '@/lib/render/color';
import { deedContent } from '@/lib/render/deed-rows';
import { bestTextOn } from '@/lib/render/gamut';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { THEMES, type Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { FitText } from './fit-text';
import { FreeLayers, type RenderLayer } from './free-layers';
import { CARD_SIZE_MM } from './game-card';
import { Icon } from './icons';
import { BAND_OPACITY, PhotoSlot, isFullPhoto } from './photo-slot';
import { Abs, Frame, Sheet, useRender, type ElementProps } from './sheet';

export interface TitleDeedProps extends ElementProps {
    space: OwnableSpace;
    side: 'front' | 'back';
    /** Replaces the name from the game data. */
    name?: string;
    /** Town of the colour group (streets only); shown small above the name. */
    town?: string;
    photo?: PhotoSource;
    /** Free layers on the back, in mm from the top left of the card. */
    layers?: readonly RenderLayer[];
}

/** Inset of the thin frame from the trim edge, and of the coloured block from the trim edge (B133). */
const FRAME = 3;
const BLOCK = 4.5;
const BLOCK_HEIGHT = 16.5;
/** Where the rule under the rent table of a street sits, and the height of a cost row below it. */
const RULE_Y = 66.5;
const COST_ROW = 5;

function bandColor(
    space: OwnableSpace,
    theme: Theme,
    groupColors?: Partial<Record<GroupId, string>>,
): string {
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
}

/** Whether the edition gave this street's group a colour of its own. */
function isOwnGroupColor(
    space: OwnableSpace,
    style: { groupColors?: Partial<Record<GroupId, string>> },
): boolean {
    return (
        space.type === 'street' &&
        style.groupColors?.[space.group] !== undefined
    );
}

/** The town to print on a deed: only streets have one, and an empty text is none. */
function townLabel(space: OwnableSpace, town: string | undefined) {
    const text = space.type === 'street' ? town?.trim() : undefined;

    return text === undefined || text === '' ? undefined : text;
}

/**
 * A title deed at 63 x 88 mm, built like the original (B133): a thin frame, a block in the group colour with
 * "EIGENDOMSBEWIJS" and the name, the rent rows, a rule and the building costs. The back holds the mortgage.
 */
export function TitleDeed({
    space,
    side,
    name,
    town,
    photo,
    layers,
    ...element
}: TitleDeedProps) {
    const { w, h } = { w: CARD_SIZE_MM.width, h: CARD_SIZE_MM.height };
    const theme = THEMES[element.theme];

    return (
        <Sheet
            {...element}
            element={`deed-${space.type}-${side}`}
            widthMm={w}
            heightMm={h}
            background={theme.deedPaper}
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
                    bleed={element.bleedMm ?? 0}
                />
            ) : (
                <DeedBack space={space} w={w} h={h} name={name} town={town} />
            )}
            {side === 'back' && layers !== undefined && (
                <FreeLayers layers={layers} />
            )}
        </Sheet>
    );
}

interface FrontProps {
    space: OwnableSpace;
    w: number;
    h: number;
    name?: string;
    town?: string;
    photo?: PhotoSource;
    bleed: number;
}

function iconOf(space: OwnableSpace): 'train' | 'bulb' | 'tap' | null {
    if (space.type === 'station') {
        return 'train';
    }

    if (space.type === 'utility') {
        return space.position === 12 ? 'bulb' : 'tap';
    }

    return null;
}

/** One line of the table: the label on the left, the amount on the right. */
function Row({
    label,
    value,
    height,
    font,
}: {
    label: string;
    value: string;
    height: number;
    font: number;
}) {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: mm(2),
                height: mm(height),
                fontSize: mm(font),
                whiteSpace: 'nowrap',
            }}
            data-row=""
        >
            <span>{label}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        </div>
    );
}

/** The colour of the block and the text on it: the group colour for streets, the paper for the others. */
function blockColors(
    space: OwnableSpace,
    theme: Theme,
    style: { groupColors?: Partial<Record<GroupId, string>> } | undefined,
): { band: string; onBand: string } {
    const band =
        space.type === 'street'
            ? bandColor(space, theme, style?.groupColors)
            : theme.deedPaper;
    const onBand =
        style?.groupColors !== undefined && isOwnGroupColor(space, style)
            ? bestTextOn(band)
            : readableOn(band);

    return { band, onBand };
}

function DeedFront({ space, w, h, name, town, photo, bleed }: FrontProps) {
    const { theme, locale, currency, words, style } = useRender();
    const t = STRINGS[locale];
    const content = deedContent(space, locale, currency, words);
    const title = name ?? space.name[locale];
    const townText = townLabel(space, town);
    const { band, onBand } = blockColors(space, theme, style);
    const hasPhoto = photo !== undefined;
    // "Full": the photo fills the top of the card behind the block (B124); the table keeps its own paper.
    const full = hasPhoto && isFullPhoto(photo);
    const blockBottom = BLOCK + BLOCK_HEIGHT;
    const photoBottom = 35;
    const contentTop = hasPhoto ? photoBottom + 1.5 : blockBottom + 2.5;
    const iconName = iconOf(space);
    const iconSize =
        iconName === null || hasPhoto ? 0 : space.type === 'utility' ? 15 : 12;
    const rowsTop = contentTop + (iconSize > 0 ? iconSize + 3.5 : 0);
    const rowsBottom = space.type === 'street' ? RULE_Y - 1 : h - FRAME - 4;
    const rowCount = content.rows.length;
    const rowHeight =
        rowCount === 0 ? 0 : Math.min(6.5, (rowsBottom - rowsTop) / rowCount);
    const rowFont = Math.min(3.3, rowHeight * 0.62);

    return (
        <>
            {full && (
                <>
                    <PhotoSlot
                        x={-bleed}
                        y={-bleed}
                        w={w + 2 * bleed}
                        h={photoBottom + bleed}
                        photo={photo}
                    />
                    <Abs
                        x={FRAME}
                        y={photoBottom}
                        w={w - 2 * FRAME}
                        h={h - photoBottom - FRAME}
                        style={{ background: theme.deedPaper }}
                    />
                </>
            )}
            <Frame
                x={FRAME}
                y={FRAME}
                w={w - 2 * FRAME}
                h={h - 2 * FRAME}
                color={theme.deedFrame}
                strokeMm={theme.deedFrameMm}
            />
            <DeedHeader
                w={w}
                label={t.titleDeed}
                title={title}
                townText={townText}
                band={band}
                bandBackground={full ? withAlpha(band, BAND_OPACITY) : band}
                onBand={onBand}
                outline={theme.deedFrame}
            />
            {hasPhoto && !full && (
                <PhotoSlot
                    x={BLOCK}
                    y={blockBottom + 1.5}
                    w={w - 2 * BLOCK}
                    h={photoBottom - blockBottom - 1.5}
                    photo={photo}
                />
            )}
            {iconName !== null && iconSize > 0 && (
                <Icon
                    name={iconName}
                    x={(w - iconSize) / 2}
                    y={contentTop + 0.5}
                    size={iconSize}
                    color={theme.ink}
                    strokeWidth={1.5}
                />
            )}
            {rowCount > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        left: mm(BLOCK + 0.5),
                        top: mm(rowsTop),
                        width: mm(w - 2 * BLOCK - 1),
                    }}
                    data-slot="rent-table"
                >
                    {content.rows.map((row) => (
                        <Row
                            key={row.label}
                            label={row.label}
                            value={row.value}
                            height={rowHeight}
                            font={rowFont}
                        />
                    ))}
                </div>
            )}
            {content.costs.length > 0 && (
                <>
                    <Abs
                        x={BLOCK + 0.5}
                        y={RULE_Y}
                        w={w - 2 * BLOCK - 1}
                        h={0}
                        style={{ borderTop: `0.2mm solid ${theme.ink}` }}
                        slot="rule"
                    />
                    <div
                        style={{
                            position: 'absolute',
                            left: mm(BLOCK + 0.5),
                            top: mm(RULE_Y + 1),
                            width: mm(w - 2 * BLOCK - 1),
                        }}
                        data-slot="costs"
                    >
                        {content.costs.map((row) => (
                            <Row
                                key={row.label}
                                label={row.label}
                                value={row.value}
                                height={COST_ROW}
                                font={3.1}
                            />
                        ))}
                        <div
                            style={{
                                textAlign: 'right',
                                fontSize: mm(2.3),
                                lineHeight: 1,
                                whiteSpace: 'nowrap',
                            }}
                            data-slot="costs-note"
                        >
                            {content.costsNote}
                        </div>
                    </div>
                </>
            )}
            {space.type === 'utility' && (
                <FitText
                    text={content.footer}
                    x={BLOCK + 1.5}
                    y={rowsTop}
                    w={w - 2 * BLOCK - 3}
                    h={h - FRAME - 3 - rowsTop}
                    maxFontMm={3.3}
                    minFontMm={1.8}
                    wrap="words"
                    font="body"
                    align="center"
                    valign={hasPhoto ? 'middle' : 'top'}
                    lineHeight={1.35}
                    slot="footer"
                />
            )}
        </>
    );
}

/** The block at the top of both sides: "EIGENDOMSBEWIJS" small, the town if any, and the name in capitals. */
function DeedHeader({
    w,
    label,
    title,
    townText,
    band,
    bandBackground = band,
    onBand,
    outline,
}: {
    w: number;
    label: string;
    title: string;
    townText: string | undefined;
    band: string;
    /** The colour the band is painted with when it differs from `band` (translucent over a full photo). */
    bandBackground?: string;
    onBand: string;
    outline: string;
}) {
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
}

function DeedBack({
    space,
    w,
    h,
    name,
    town,
}: {
    space: OwnableSpace;
    w: number;
    h: number;
    name?: string;
    town?: string;
}) {
    const { theme, locale, currency, words, style } = useRender();
    const t = STRINGS[locale];
    const content = deedContent(space, locale, currency, words);
    const { band, onBand } = blockColors(space, theme, style);
    const townText = townLabel(space, town);
    const iconName = iconOf(space);
    // The mortgage sits in a box of its own under the block; our own words about it below (B76).
    const boxTop = BLOCK + BLOCK_HEIGHT + 6;
    const boxHeight = 36;
    const textTop = boxTop + boxHeight + 3;
    const valueTop = boxTop + (iconName === null ? 11 : 15.5);

    return (
        <>
            <Frame
                x={FRAME}
                y={FRAME}
                w={w - 2 * FRAME}
                h={h - 2 * FRAME}
                color={theme.deedFrame}
                strokeMm={theme.deedFrameMm}
            />
            <DeedHeader
                w={w}
                label={t.titleDeed}
                title={name ?? space.name[locale]}
                townText={townText}
                band={band}
                onBand={onBand}
                outline={theme.deedFrame}
            />
            <Frame
                x={BLOCK + 3}
                y={boxTop}
                w={w - 2 * BLOCK - 6}
                h={boxHeight}
                color={theme.ink}
                strokeMm={0.25}
            />
            {iconName !== null && (
                <Icon
                    name={iconName}
                    x={(w - 7) / 2}
                    y={boxTop + 2.5}
                    size={7}
                    color={theme.ink}
                    strokeWidth={1.5}
                />
            )}
            <FitText
                text={t.mortgage.toUpperCase()}
                x={BLOCK + 5}
                y={valueTop - 6}
                w={w - 2 * BLOCK - 10}
                h={5}
                maxFontMm={3}
                minFontMm={2}
                font="body"
                weight={600}
                align="center"
                slot="mortgage-label"
            />
            <FitText
                text={content.mortgage}
                x={BLOCK + 5}
                y={valueTop}
                w={w - 2 * BLOCK - 10}
                h={boxTop + boxHeight - 3 - valueTop}
                maxFontMm={12}
                minFontMm={5}
                font="heading"
                align="center"
                slot="mortgage"
            />
            <FitText
                text={t.mortgageBack(content.unmortgage)}
                x={BLOCK + 2}
                y={textTop}
                w={w - 2 * BLOCK - 4}
                h={h - FRAME - 3 - textTop}
                maxFontMm={2.9}
                minFontMm={1.8}
                wrap="words"
                font="body"
                align="center"
                valign="top"
                lineHeight={1.3}
                slot="mortgage-text"
            />
        </>
    );
}
