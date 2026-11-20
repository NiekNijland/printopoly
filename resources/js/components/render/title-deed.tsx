import { standardEdition, formatMoney } from '@/lib/game/standard-edition';
import type { OwnableSpace } from '@/lib/game/types';
import { readableOn } from '@/lib/render/color';
import { deedContent } from '@/lib/render/deed-rows';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { resolveLayout, THEMES, type Layout } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { FitText } from './fit-text';
import { CARD_SIZE_MM } from './game-card';
import { PhotoSlot } from './photo-slot';
import { Abs, Frame, Sheet, useRender, type ElementProps } from './sheet';

export interface TitleDeedProps extends ElementProps {
    space: OwnableSpace;
    side: 'front' | 'back';
    /** Replaces the name from the game data. */
    name?: string;
    layout?: Layout;
    photo?: PhotoSource;
    placeholder?: boolean;
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
    layout,
    photo,
    placeholder = false,
    ...element
}: TitleDeedProps) {
    const { w, h } = { w: CARD_SIZE_MM.width, h: CARD_SIZE_MM.height };
    const theme = THEMES[element.theme];
    const resolved = resolveLayout(element.theme, 'deed', layout);
    const bleed = element.bleedMm ?? 0;
    const full = side === 'front' && resolved === 'full' && photo !== undefined;

    return (
        <Sheet
            {...element}
            element={`deed-${space.type}-${side}`}
            widthMm={w}
            heightMm={h}
            background={theme.paper}
            rounded
            underlay={
                full ? (
                    <PhotoSlot
                        x={0}
                        y={0}
                        w={w + 2 * bleed}
                        h={h + 2 * bleed}
                        photo={photo}
                    />
                ) : undefined
            }
        >
            {side === 'front' ? (
                <DeedFront
                    space={space}
                    w={w}
                    h={h}
                    name={name}
                    layout={resolved}
                    photo={photo}
                    placeholder={placeholder}
                />
            ) : (
                <DeedBack space={space} w={w} h={h} name={name} />
            )}
        </Sheet>
    );
}

interface FrontProps {
    space: OwnableSpace;
    w: number;
    h: number;
    name?: string;
    layout: Layout;
    photo?: PhotoSource;
    placeholder: boolean;
}

function DeedFront({
    space,
    w,
    h,
    name,
    layout,
    photo,
    placeholder,
}: FrontProps) {
    const { theme, locale, currency } = useRender();
    const t = STRINGS[locale];
    const content = deedContent(space, locale, currency);
    const title = name ?? space.name[locale];
    const band = bandColor(space, theme.ink);
    const onBand = readableOn(band);
    const full = layout === 'full' && photo !== undefined;
    const framedPhoto = layout === 'framed';
    const tableTop = framedPhoto ? 35 : 21;
    const panel = { background: theme.paper, opacity: 0.94 };
    const rowsHeight = content.rows.length * ROW_HEIGHT;
    const footerTop =
        space.type === 'utility' ? tableTop : tableTop + rowsHeight + 1.5;

    return (
        <>
            {full && (
                <Abs
                    x={3}
                    y={tableTop - 1}
                    w={w - 6}
                    h={h - tableTop - 3}
                    style={panel}
                />
            )}
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
                maxFontMm={2.4}
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
            {framedPhoto && (
                <PhotoSlot
                    x={3}
                    y={18.5}
                    w={w - 6}
                    h={14.5}
                    photo={photo}
                    placeholder={placeholder ? '#CFC6B2' : undefined}
                />
            )}
            <div
                style={{
                    position: 'absolute',
                    left: mm(6),
                    top: mm(tableTop),
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
                            height: mm(ROW_HEIGHT),
                            fontSize: mm(2.9),
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
            {content.footer !== '' && (
                <FitText
                    text={content.footer}
                    x={6}
                    y={footerTop}
                    w={w - 12}
                    h={space.type === 'utility' ? 24 : 7}
                    maxFontMm={space.type === 'utility' ? 3.4 : 2.7}
                    minFontMm={1.8}
                    wrap="words"
                    font="body"
                    align="center"
                    valign={space.type === 'utility' ? 'top' : 'middle'}
                    slot="footer"
                />
            )}
            <FitText
                text={`${t.price} ${formatMoney(space.price, currency, locale)}`}
                x={6}
                y={h - 13}
                w={w - 12}
                h={6}
                maxFontMm={3.2}
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
