import { standardEdition } from '@/lib/game/standard-edition';
import type { OwnableSpace } from '@/lib/game/types';
import { readableOn, withAlpha } from '@/lib/render/color';
import { deedContent } from '@/lib/render/deed-rows';
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

const ROW_HEIGHT = 4.2;

function bandColor(space: OwnableSpace, theme: Theme): string {
    if (space.type === 'street') {
        return (
            theme.groupColors?.[space.group] ??
            standardEdition.groups.find((group) => group.id === space.group)
                ?.color ??
            theme.ink
        );
    }

    return theme.ink;
}

/** The town to print on a deed: only streets have one, and an empty text is none. */
function townLabel(space: OwnableSpace, town: string | undefined) {
    const text = space.type === 'street' ? town?.trim() : undefined;

    return text === undefined || text === '' ? undefined : text;
}

/** A title deed at 63 x 88 mm, with the rent table from the game data on the front. */
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

function DeedFront({ space, w, h, name, town, photo, bleed }: FrontProps) {
    const { theme, locale, currency, words, money } = useRender();
    const t = STRINGS[locale];
    const content = deedContent(space, locale, currency, words);
    const title = name ?? space.name[locale];
    const townText = townLabel(space, town);
    const band = bandColor(space, theme);
    const onBand = readableOn(band);
    // Without a photo the photo strip is left out, so the table can use the space.
    const hasPhoto = photo !== undefined;
    // "Full": the photo is the header of the card, behind the title; the rent table keeps its own paper.
    const full = hasPhoto && isFullPhoto(photo);
    const isUtility = space.type === 'utility';
    const isStation = space.type === 'station';
    const areaTop = full ? 36 : hasPhoto ? 34.5 : 19;
    const areaBottom = h - 15;
    const areaHeight = areaBottom - areaTop;
    const footerHeight = content.footer !== '' && !isUtility ? 8 : 0;
    const iconSize = isUtility
        ? 16
        : isStation
          ? Math.min(14, hasPhoto ? 9 : 14)
          : 0;
    const iconGap = iconSize > 0 ? 3 : 0;
    const textHeight = isUtility ? 26 : 0;
    const rowCount = content.rows.length;
    const rowHeight =
        rowCount === 0
            ? 0
            : Math.min(
                  6,
                  Math.max(
                      ROW_HEIGHT,
                      (areaHeight - footerHeight - iconSize - iconGap) /
                          rowCount,
                  ),
              );
    const rowsHeight = rowCount * rowHeight;
    const blockHeight =
        iconSize + iconGap + rowsHeight + footerHeight + textHeight;
    const blockTop = areaTop + Math.max(0, (areaHeight - blockHeight) / 2);
    const iconTop = blockTop;
    const rowsTop = blockTop + iconSize + iconGap;
    const footerTop = rowsTop + rowsHeight + 1.2;
    const rowFont = Math.min(3.4, rowHeight * 0.68);
    const iconName = isStation
        ? 'train'
        : space.position === 12
          ? 'bulb'
          : 'tap';

    return (
        <>
            {full && (
                <PhotoSlot
                    x={-bleed}
                    y={-bleed}
                    w={w + 2 * bleed}
                    h={36 + bleed}
                    photo={photo}
                />
            )}
            <Frame
                x={3}
                y={3}
                w={w - 6}
                h={h - 6}
                color={full ? theme.paper : theme.deedFrame}
                strokeMm={theme.deedFrameMm}
            />
            {full && (
                <Frame
                    x={3}
                    y={36}
                    w={w - 6}
                    h={h - 36 - 3}
                    color={theme.deedFrame}
                    strokeMm={theme.deedFrameMm}
                    fill={theme.paper}
                />
            )}
            <DeedHeader
                w={w}
                label={t.titleDeed}
                title={title}
                townText={townText}
                band={band}
                bandBackground={full ? withAlpha(band, BAND_OPACITY) : band}
                onBand={onBand}
            />
            {hasPhoto && !full && (
                <>
                    <PhotoSlot x={3} y={18} w={w - 6} h={15.5} photo={photo} />
                    <Abs
                        x={3}
                        y={33.5}
                        w={w - 6}
                        h={0}
                        style={{
                            borderTop: `${theme.deedFrameMm}mm solid ${theme.deedFrame}`,
                        }}
                    />
                </>
            )}
            {iconSize > 0 && (
                <Icon
                    name={iconName}
                    x={(w - iconSize) / 2}
                    y={iconTop}
                    size={iconSize}
                    color={theme.ink}
                    strokeWidth={1.5}
                />
            )}
            {rowCount > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        left: mm(6),
                        top: mm(rowsTop),
                        width: mm(w - 12),
                    }}
                    data-slot="rent-table"
                >
                    {content.rows.map((row) => (
                        <div
                            key={row.label}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                height: mm(rowHeight),
                                fontSize: mm(rowFont),
                                whiteSpace: 'nowrap',
                            }}
                            data-row=""
                        >
                            <span>{row.label}</span>
                            <span style={{ fontFamily: theme.monoFont }}>
                                {row.value}
                            </span>
                        </div>
                    ))}
                </div>
            )}
            {content.footer !== '' && !isUtility && (
                <>
                    <Abs
                        x={6}
                        y={footerTop}
                        w={w - 12}
                        h={0}
                        style={{ borderTop: `0.2mm solid ${theme.line}` }}
                    />
                    <FitText
                        text={content.footer}
                        x={6}
                        y={footerTop + 1}
                        w={w - 12}
                        h={footerHeight - 2}
                        maxFontMm={2.7}
                        minFontMm={1.8}
                        wrap="words"
                        font="body"
                        align="center"
                        slot="footer"
                    />
                </>
            )}
            {isUtility && (
                <FitText
                    text={content.footer}
                    x={7}
                    y={rowsTop}
                    w={w - 14}
                    h={textHeight}
                    maxFontMm={3.4}
                    minFontMm={1.8}
                    wrap="words"
                    font="body"
                    align="center"
                    valign="top"
                    slot="footer"
                />
            )}
            <Abs
                x={6}
                y={areaBottom}
                w={w - 12}
                h={0}
                style={{ borderTop: `0.2mm solid ${theme.line}` }}
            />
            <FitText
                text={`${t.price} ${money(space.price)}`}
                x={6}
                y={h - 14}
                w={w - 12}
                h={8}
                maxFontMm={3.4}
                minFontMm={2}
                font="mono"
                align="center"
                slot="price"
            />
        </>
    );
}

/** The coloured band at the top of both sides: the label "Eigendomsbewijs", the town and the name. */
function DeedHeader({
    w,
    label,
    title,
    townText,
    band,
    bandBackground = band,
    onBand,
}: {
    w: number;
    label: string;
    title: string;
    townText: string | undefined;
    band: string;
    /** The colour the band is painted with when it differs from `band` (translucent over a full photo). */
    bandBackground?: string;
    onBand: string;
}) {
    return (
        <>
            <Abs
                x={3}
                y={3}
                w={w - 6}
                h={15}
                style={{ background: bandBackground }}
                slot="band"
            />
            <FitText
                text={label}
                x={5}
                y={3.8}
                w={w - 10}
                h={townText === undefined ? 4 : 3.4}
                maxFontMm={townText === undefined ? 3.4 : 2.8}
                minFontMm={2.2}
                font="heading"
                weight={700}
                color={onBand}
                align="center"
                slot="label"
            />
            {townText !== undefined && (
                <FitText
                    text={townText}
                    x={5}
                    y={7.2}
                    w={w - 10}
                    h={3.2}
                    maxFontMm={2.8}
                    minFontMm={1.6}
                    font="body"
                    weight={600}
                    color={onBand}
                    align="center"
                    slot="town"
                />
            )}
            <FitText
                text={title}
                x={5}
                y={townText === undefined ? 8 : 10.4}
                w={w - 10}
                h={townText === undefined ? 9.2 : 6.8}
                maxFontMm={5.6}
                minFontMm={2.4}
                font="heading"
                color={onBand}
                align="center"
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
    const { theme, locale, currency, words } = useRender();
    const t = STRINGS[locale];
    const content = deedContent(space, locale, currency, words);
    const band = bandColor(space, theme);
    const onBand = readableOn(band);
    const townText = townLabel(space, town);
    const iconName =
        space.type === 'station'
            ? 'train'
            : space.type === 'utility'
              ? space.position === 12
                  ? 'bulb'
                  : 'tap'
              : null;
    // The mortgage block sits in the middle of the card, between the header band and a closing band.
    const bodyTop = 21;
    const bodyBottom = h - 12;
    const iconSize = iconName === null ? 0 : 12;
    const blockHeight = iconSize + (iconSize > 0 ? 3 : 0) + 6 + 15 + 18;
    const top = bodyTop + Math.max(0, (bodyBottom - bodyTop - blockHeight) / 2);
    const labelTop = top + iconSize + (iconSize > 0 ? 3 : 0);

    return (
        <>
            <Frame
                x={3}
                y={3}
                w={w - 6}
                h={h - 6}
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
            />
            {iconName !== null && (
                <Icon
                    name={iconName}
                    x={(w - iconSize) / 2}
                    y={top}
                    size={iconSize}
                    color={theme.ink}
                    strokeWidth={1.5}
                />
            )}
            <FitText
                text={t.mortgage}
                x={6}
                y={labelTop}
                w={w - 12}
                h={6}
                maxFontMm={3.8}
                minFontMm={2.4}
                font="body"
                weight={600}
                align="center"
            />
            <FitText
                text={content.mortgage}
                x={6}
                y={labelTop + 6}
                w={w - 12}
                h={15}
                maxFontMm={13}
                minFontMm={5}
                font="heading"
                align="center"
                slot="mortgage"
            />
            <FitText
                text={t.mortgageBack(content.unmortgage)}
                x={8}
                y={labelTop + 22}
                w={w - 16}
                h={16}
                maxFontMm={3}
                minFontMm={1.8}
                wrap="words"
                font="body"
                align="center"
                slot="mortgage-text"
            />
            <Abs
                x={3}
                y={h - 9}
                w={w - 6}
                h={6}
                style={{ background: band }}
                slot="band-bottom"
            />
        </>
    );
}
