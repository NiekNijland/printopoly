import { standardEdition, formatMoney } from '@/lib/game/standard-edition';
import type { OwnableSpace } from '@/lib/game/types';
import { readableOn } from '@/lib/render/color';
import { deedContent } from '@/lib/render/deed-rows';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { THEMES } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { FitText } from './fit-text';
import { FreeLayers, type RenderLayer } from './free-layers';
import { CARD_SIZE_MM } from './game-card';
import { Icon } from './icons';
import { PhotoSlot } from './photo-slot';
import { Abs, Frame, Sheet, useRender, type ElementProps } from './sheet';

export interface TitleDeedProps extends ElementProps {
    space: OwnableSpace;
    side: 'front' | 'back';
    /** Replaces the name from the game data. */
    name?: string;
    photo?: PhotoSource;
    placeholder?: boolean;
    /** Free layers on the back, in mm from the top left of the card. */
    layers?: readonly RenderLayer[];
}

const ROW_HEIGHT = 4.2;

function bandColor(space: OwnableSpace, ink: string): string {
    if (space.type === 'street') {
        return (
            standardEdition.groups.find((group) => group.id === space.group)
                ?.color ?? ink
        );
    }

    return ink;
}

/** A title deed at 63 x 88 mm, with the rent table from the game data on the front. */
export function TitleDeed({
    space,
    side,
    name,
    photo,
    placeholder = false,
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
            background={theme.paper}
            rounded
        >
            {side === 'front' ? (
                <DeedFront
                    space={space}
                    w={w}
                    h={h}
                    name={name}
                    photo={photo}
                    placeholder={placeholder}
                />
            ) : (
                <DeedBack space={space} w={w} h={h} name={name} />
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
    photo?: PhotoSource;
    placeholder: boolean;
}

function DeedFront({ space, w, h, name, photo, placeholder }: FrontProps) {
    const { theme, locale, currency } = useRender();
    const t = STRINGS[locale];
    const content = deedContent(space, locale, currency);
    const title = name ?? space.name[locale];
    const band = bandColor(space, theme.ink);
    const onBand = readableOn(band);
    // Without a photo or placeholder the photo strip is left out, so the table can use the space.
    const hasPhoto = photo !== undefined || placeholder;
    const isUtility = space.type === 'utility';
    const isStation = space.type === 'station';
    const areaTop = hasPhoto ? 34.5 : 19;
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
            <Frame
                x={3}
                y={3}
                w={w - 6}
                h={h - 6}
                color={theme.ink}
                strokeMm={theme.frameMm}
            />
            <Abs
                x={3}
                y={3}
                w={w - 6}
                h={15}
                style={{ background: band }}
                slot="band"
            />
            <FitText
                text={t.titleDeed}
                x={5}
                y={4}
                w={w - 10}
                h={3.6}
                maxFontMm={2.9}
                minFontMm={1.8}
                font="body"
                color={onBand}
                align="center"
            />
            <FitText
                text={title}
                x={5}
                y={7.6}
                w={w - 10}
                h={9.6}
                maxFontMm={5.6}
                minFontMm={2.4}
                font="heading"
                color={onBand}
                align="center"
                slot="name"
            />
            {hasPhoto && (
                <>
                    <PhotoSlot
                        x={3}
                        y={18}
                        w={w - 6}
                        h={15.5}
                        photo={photo}
                        placeholder={placeholder ? '#CFC6B2' : undefined}
                    />
                    <Abs
                        x={3}
                        y={33.5}
                        w={w - 6}
                        h={0}
                        style={{
                            borderTop: `${theme.frameMm}mm solid ${theme.ink}`,
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
                text={`${t.price} ${formatMoney(space.price, currency, locale)}`}
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

function DeedBack({
    space,
    w,
    h,
    name,
}: {
    space: OwnableSpace;
    w: number;
    h: number;
    name?: string;
}) {
    const { theme, locale, currency } = useRender();
    const t = STRINGS[locale];
    const content = deedContent(space, locale, currency);
    const band = bandColor(space, theme.ink);

    return (
        <>
            <Frame
                x={3}
                y={3}
                w={w - 6}
                h={h - 6}
                color={theme.ink}
                strokeMm={theme.frameMm}
            />
            <Abs
                x={3}
                y={3}
                w={w - 6}
                h={5}
                style={{ background: band }}
                slot="band"
            />
            <FitText
                text={name ?? space.name[locale]}
                x={6}
                y={14}
                w={w - 12}
                h={9}
                maxFontMm={5.2}
                minFontMm={2.4}
                font="heading"
                align="center"
                slot="name"
            />
            <FitText
                text={t.mortgage}
                x={6}
                y={h * 0.36}
                w={w - 12}
                h={6}
                maxFontMm={3.6}
                minFontMm={2.4}
                font="body"
                align="center"
            />
            <FitText
                text={content.mortgage}
                x={6}
                y={h * 0.36 + 7}
                w={w - 12}
                h={14}
                maxFontMm={11}
                minFontMm={5}
                font="heading"
                align="center"
                slot="mortgage"
            />
            <FitText
                text={t.mortgageBack(content.unmortgage)}
                x={9}
                y={h * 0.36 + 24}
                w={w - 18}
                h={16}
                maxFontMm={2.9}
                minFontMm={1.8}
                wrap="words"
                font="body"
                align="center"
                slot="mortgage-text"
            />
        </>
    );
}
