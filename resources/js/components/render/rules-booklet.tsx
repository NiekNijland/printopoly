import type { CSSProperties, ReactNode } from 'react';

import { standardEdition } from '@/lib/game/standard-edition';
import { BOOKLET_PAGE } from '@/lib/print/extras';
import { BOOKLET_COVER_BOX, BOOKLET_TITLE_BOX } from '@/lib/render/name-boxes';
import type { PhotoSource } from '@/lib/render/photo';
import {
    bookletPages,
    type BookletPageContent,
    type PriceListPage,
    type RulesBlock,
    type RulesContext,
} from '@/lib/render/rules-booklet';
import { THEMES, type Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { FitText } from './fit-text';
import { Icon } from './icons';
import { InkBar } from './ink-bar';
import { PhotoSlot } from './photo-slot';
import { Abs, Frame, Sheet, useRender, type ElementProps } from './sheet';

export interface RulesBookletPageProps extends ElementProps {
    /** 1 to 16. */
    page: number;
    context: RulesContext;
    /** Photo on the cover. */
    photo?: PhotoSource;
}

/** The colour the booklet uses for kickers and rules: the accent of the theme, or its second one when that is plain ink. */
export function brandColor(theme: Theme): string {
    return theme.accent === theme.ink ? theme.secondaryAccent : theme.accent;
}

const SIDE = 13;
const BODY_W = BOOKLET_PAGE.w - 2 * SIDE;

function Body({
    blocks,
    theme,
    size = 4.2,
}: {
    blocks: RulesBlock[];
    theme: Theme;
    size?: number;
}) {
    const gap = size * 0.9;
    const base: CSSProperties = {
        margin: 0,
        fontSize: mm(size),
        lineHeight: 1.42,
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: mm(gap),
                fontSize: mm(size),
            }}
        >
            {blocks.map((block, index) => {
                if (block.type === 'p') {
                    return (
                        <p key={index} style={base}>
                            {block.text}
                        </p>
                    );
                }

                if (block.type === 'tip') {
                    return (
                        <p
                            key={index}
                            style={{
                                ...base,
                                padding: `${mm(2)} ${mm(3)}`,
                                borderLeft: `${mm(1.2)} solid ${brandColor(theme)}`,
                                background: theme.cornerBackground,
                                fontWeight: 600,
                            }}
                        >
                            {block.text}
                        </p>
                    );
                }

                return (
                    <ul
                        key={index}
                        style={{
                            ...base,
                            listStyle: 'none',
                            padding: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: mm(1.4),
                        }}
                    >
                        {block.items.map((item, itemIndex) => (
                            <li
                                key={itemIndex}
                                style={{
                                    display: 'flex',
                                    gap: mm(2.4),
                                    alignItems: 'flex-start',
                                }}
                            >
                                <span
                                    style={{
                                        flex: 'none',
                                        width: mm(
                                            block.numbered === true ? 5.6 : 2.4,
                                        ),
                                        height: mm(
                                            block.numbered === true ? 5.6 : 2.4,
                                        ),
                                        marginTop: mm(
                                            block.numbered === true ? 0.1 : 1.7,
                                        ),
                                        borderRadius: '50%',
                                        background: brandColor(theme),
                                        color: '#fff',
                                        fontFamily: theme.headingFont,
                                        fontWeight: 800,
                                        fontSize: mm(3.4),
                                        lineHeight: mm(5.6),
                                        textAlign: 'center',
                                    }}
                                >
                                    {block.numbered === true
                                        ? itemIndex + 1
                                        : ''}
                                </span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                );
            })}
        </div>
    );
}

function Header({
    kicker,
    title,
    theme,
}: {
    kicker: string;
    title: string;
    theme: Theme;
}) {
    return (
        <>
            <Abs x={SIDE} y={14} w={BODY_W} h={5}>
                <span
                    style={{
                        fontFamily: theme.monoFont,
                        fontSize: mm(2.8),
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: brandColor(theme),
                    }}
                >
                    {kicker}
                </span>
            </Abs>
            {/* A long edition name wraps over up to three lines, and is cut off rather than run over the page. */}
            <FitText
                text={title}
                x={SIDE}
                y={19.5}
                w={BOOKLET_TITLE_BOX.w}
                h={BOOKLET_TITLE_BOX.h}
                maxFontMm={BOOKLET_TITLE_BOX.maxFontMm}
                minFontMm={BOOKLET_TITLE_BOX.minFontMm}
                lineHeight={BOOKLET_TITLE_BOX.lineHeight}
                wrap="words"
                font="heading"
                align="left"
                valign="bottom"
                slot="booklet-title"
                clip
            />
            <Abs
                x={SIDE}
                y={32}
                w={26}
                h={1.2}
                style={{ background: brandColor(theme) }}
            />
            <InkBar
                x={BOOKLET_PAGE.w - SIDE - 16}
                y={15}
                w={16}
                h={1.2}
                theme={theme}
            />
        </>
    );
}

function Folio({
    page,
    name,
    theme,
}: {
    page: number;
    name: string;
    theme: Theme;
}) {
    const text: CSSProperties = {
        fontFamily: theme.monoFont,
        fontSize: mm(2.6),
        color: theme.ink,
        opacity: 0.7,
    };

    return (
        <>
            <Abs x={SIDE} y={BOOKLET_PAGE.h - 13} w={90} h={4}>
                <span style={text}>{name}</span>
            </Abs>
            <Abs
                x={BOOKLET_PAGE.w - SIDE - 20}
                y={BOOKLET_PAGE.h - 13}
                w={20}
                h={4}
            >
                <span style={{ ...text, display: 'block', textAlign: 'right' }}>
                    {page}
                </span>
            </Abs>
        </>
    );
}

/**
 * A long street name in the price list gets a smaller letter and a second line instead of being cut off ("De
 * burgemeesterswoni…", bug 19 of test round 4). The name column holds about 20 letters at full size.
 */
function priceNameFit(name: string): CSSProperties {
    const length = [...name].length;

    if (length <= 20) {
        return { overflow: 'hidden', textOverflow: 'ellipsis' };
    }

    return {
        fontSize: mm(length <= 26 ? 2.7 : length <= 44 ? 2.4 : 2.1),
        lineHeight: 1.05,
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: 2,
        overflow: 'hidden',
    };
}

function PriceTable({
    content,
    theme,
}: {
    content: PriceListPage;
    theme: Theme;
}) {
    const columns = '1fr 15mm 16mm 15mm 15mm 17mm';
    const cell: CSSProperties = {
        fontSize: mm(3.2),
        lineHeight: 1,
        whiteSpace: 'nowrap',
    };
    const number: CSSProperties = { ...cell, textAlign: 'right' };
    const head: CSSProperties = {
        ...cell,
        fontFamily: theme.monoFont,
        fontSize: mm(2.3),
        textTransform: 'uppercase',
        opacity: 0.7,
    };
    const colors = new Map<string, string>(
        standardEdition.groups.map((group) => [group.id, group.color]),
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: columns,
                    columnGap: mm(1.5),
                    paddingBottom: mm(1.2),
                    borderBottom: `${mm(0.3)} solid ${theme.ink}`,
                }}
            >
                <span style={head}>{content.heads.name}</span>
                <span style={{ ...head, textAlign: 'right' }}>
                    {content.heads.price}
                </span>
                <span style={{ ...head, textAlign: 'right' }}>
                    {content.heads.rent}
                </span>
                <span style={{ ...head, textAlign: 'right' }}>
                    {content.heads.hotel}
                </span>
                <span style={{ ...head, textAlign: 'right' }}>
                    {content.heads.house}
                </span>
                <span style={{ ...head, textAlign: 'right' }}>
                    {content.heads.mortgage}
                </span>
            </div>
            {content.groups.map((group) => (
                <div key={group.id} style={{ marginTop: mm(2.2) }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: mm(1.6),
                            marginBottom: mm(0.8),
                        }}
                    >
                        <span
                            style={{
                                width: mm(10),
                                height: mm(2.6),
                                background: colors.get(group.id) ?? theme.ink,
                                border: `${mm(0.2)} solid ${theme.ink}`,
                            }}
                        />
                        <span
                            style={{
                                fontFamily: theme.headingFont,
                                fontWeight: 800,
                                fontSize: mm(3),
                            }}
                        >
                            {group.label}
                        </span>
                    </div>
                    {group.rows.map((row) => (
                        <div
                            key={row.name}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: columns,
                                columnGap: mm(1.5),
                                alignItems: 'center',
                                height: mm(5.4),
                                borderBottom: `${mm(0.12)} solid ${theme.line}`,
                            }}
                        >
                            <span
                                data-price-name=""
                                style={{ ...cell, ...priceNameFit(row.name) }}
                            >
                                {row.name}
                            </span>
                            <span style={number}>{row.price}</span>
                            {row.group === 'station' ||
                            row.group === 'utility' ? (
                                <span
                                    style={{
                                        ...number,
                                        gridColumn: '3 / span 3',
                                    }}
                                >
                                    {row.rent}
                                </span>
                            ) : (
                                <>
                                    <span style={number}>{row.rent}</span>
                                    <span style={number}>{row.hotel}</span>
                                    <span style={number}>{row.house}</span>
                                </>
                            )}
                            <span style={number}>{row.mortgage}</span>
                        </div>
                    ))}
                </div>
            ))}
            <p
                style={{
                    margin: `${mm(3)} 0 0`,
                    fontSize: mm(2.7),
                    lineHeight: 1.35,
                    opacity: 0.8,
                }}
            >
                {content.note}
            </p>
        </div>
    );
}

function Lines({
    count,
    top,
    theme,
    step = 8.5,
}: {
    count: number;
    top: number;
    theme: Theme;
    step?: number;
}) {
    return (
        <>
            {Array.from({ length: count }, (_, index) => (
                <Abs
                    key={index}
                    x={SIDE}
                    y={top + index * step}
                    w={BODY_W}
                    h={0.2}
                    style={{ background: theme.ink, opacity: 0.35 }}
                />
            ))}
        </>
    );
}

function PageFace({
    content,
    page,
    context,
    photo,
}: {
    content: BookletPageContent;
    page: number;
    context: RulesContext;
    photo?: PhotoSource;
}) {
    const { theme } = useRender();
    const { w, h } = BOOKLET_PAGE;
    const framed = (
        <Frame
            ornate
            x={6}
            y={6}
            w={w - 12}
            h={h - 12}
            color={theme.ink}
            strokeMm={theme.frameMm}
            radiusMm={Math.max(0, theme.cardRadiusMm - 1)}
        />
    );

    switch (content.kind) {
        case 'cover': {
            const hasPhoto = photo !== undefined;

            return (
                <>
                    <Abs
                        x={0}
                        y={0}
                        w={w}
                        h={h}
                        style={{ background: theme.boardBackground }}
                    />
                    <Frame
                        ornate
                        x={6}
                        y={6}
                        w={w - 12}
                        h={h - 12}
                        color={theme.ink}
                        strokeMm={theme.frameMm + 0.3}
                    />
                    <InkBar x={SIDE} y={16} w={30} theme={theme} />
                    <FitText
                        text={content.title}
                        x={SIDE}
                        y={24}
                        w={BODY_W}
                        h={hasPhoto ? 36 : 64}
                        maxFontMm={(hasPhoto ? 17 : 24) * theme.titleScale}
                        minFontMm={BOOKLET_COVER_BOX.minFontMm}
                        wrap="words"
                        font="title"
                        align="left"
                        valign="top"
                        lineHeight={BOOKLET_COVER_BOX.lineHeight}
                        color={theme.ink}
                        slot="booklet-cover-title"
                        clip
                    />
                    {hasPhoto ? (
                        <PhotoSlot
                            x={SIDE}
                            y={66}
                            w={BODY_W}
                            h={102}
                            photo={photo}
                        />
                    ) : (
                        <>
                            {(['dice', 'chest', 'train', 'car'] as const).map(
                                (name, index) => (
                                    <Icon
                                        key={name}
                                        name={name}
                                        x={SIDE + 1 + index * 31}
                                        y={118}
                                        size={27}
                                        color={
                                            index % 2 === 0
                                                ? theme.ink
                                                : brandColor(theme)
                                        }
                                        strokeWidth={1.3}
                                    />
                                ),
                            )}
                        </>
                    )}
                    <Abs x={SIDE} y={h - 38} w={BODY_W} h={14}>
                        <span
                            style={{
                                fontFamily: theme.headingFont,
                                fontWeight: theme.headingWeight,
                                fontSize: mm(11),
                                lineHeight: 1,
                                color: brandColor(theme),
                            }}
                        >
                            {content.subtitle}
                        </span>
                    </Abs>
                    <Abs x={SIDE} y={h - 22} w={BODY_W} h={5}>
                        <span style={{ fontSize: mm(3.8) }}>
                            {context.locale === 'nl'
                                ? 'Een spel voor 2 tot 8 spelers'
                                : 'A game for 2 to 8 players'}
                        </span>
                    </Abs>
                    <InkBar x={SIDE} y={h - 16} w={30} theme={theme} />
                </>
            );
        }
        case 'back':
            return (
                <>
                    <Abs
                        x={0}
                        y={0}
                        w={w}
                        h={h}
                        style={{ background: theme.cornerBackground }}
                    />
                    <Frame
                        ornate
                        x={6}
                        y={6}
                        w={w - 12}
                        h={h - 12}
                        color={theme.ink}
                        strokeMm={theme.frameMm + 0.3}
                    />
                    <FitText
                        text={content.line}
                        x={SIDE}
                        y={78}
                        w={BODY_W}
                        h={22}
                        maxFontMm={14}
                        minFontMm={6}
                        font="heading"
                        align="center"
                        color={brandColor(theme)}
                        slot="booklet-back-line"
                    />
                    <FitText
                        text={content.title}
                        x={SIDE}
                        y={102}
                        w={BODY_W}
                        h={8}
                        maxFontMm={5}
                        minFontMm={2.4}
                        wrap="words"
                        lineHeight={1.05}
                        font="body"
                        align="center"
                        slot="booklet-back-name"
                        clip
                    />
                    <InkBar x={w / 2 - 15} y={h - 26} w={30} theme={theme} />
                    <Abs x={SIDE} y={h - 20} w={BODY_W} h={5}>
                        <span
                            style={{
                                display: 'block',
                                textAlign: 'center',
                                fontFamily: theme.monoFont,
                                fontSize: mm(2.6),
                                opacity: 0.7,
                            }}
                        >
                            {content.credit}
                        </span>
                    </Abs>
                </>
            );
        case 'text':
            return (
                <>
                    {framed}
                    <Header
                        kicker={content.kicker}
                        title={content.title}
                        theme={theme}
                    />
                    <Abs x={SIDE} y={41} w={BODY_W} h={h - 41 - 20}>
                        <Body blocks={content.blocks} theme={theme} />
                    </Abs>
                    <Folio page={page} name={context.name} theme={theme} />
                </>
            );
        case 'prices':
            return (
                <>
                    {framed}
                    <Header
                        kicker={content.kicker}
                        title={content.title}
                        theme={theme}
                    />
                    <Abs x={SIDE} y={39} w={BODY_W} h={h - 39 - 18}>
                        <PriceTable content={content} theme={theme} />
                    </Abs>
                    <Folio page={page} name={context.name} theme={theme} />
                </>
            );
        case 'houseRules': {
            const written = content.rules.map(
                (rule, index) => `${index + 1}. ${rule}`,
            );

            return (
                <>
                    {framed}
                    <Header
                        kicker={content.kicker}
                        title={content.title}
                        theme={theme}
                    />
                    <Abs x={SIDE} y={39} w={BODY_W} h={10}>
                        <Body
                            blocks={[{ type: 'p', text: content.intro }]}
                            theme={theme}
                        />
                    </Abs>
                    {written.length > 0 ? (
                        <FitText
                            text={written.join('\n')}
                            x={SIDE}
                            y={52}
                            w={BODY_W}
                            h={h - 52 - 20}
                            maxFontMm={4.6}
                            minFontMm={2.4}
                            wrap="words"
                            font="body"
                            align="left"
                            valign="top"
                            lineHeight={1.35}
                            slot="booklet-house-rules"
                        />
                    ) : (
                        <Lines
                            count={content.blankLines}
                            top={64}
                            theme={theme}
                            step={9.5}
                        />
                    )}
                    <Folio page={page} name={context.name} theme={theme} />
                </>
            );
        }
        case 'notes':
            return (
                <>
                    {framed}
                    <Header
                        kicker={content.kicker}
                        title={content.title}
                        theme={theme}
                    />
                    <Abs x={SIDE} y={39} w={BODY_W} h={10}>
                        <Body
                            blocks={[{ type: 'p', text: content.intro }]}
                            theme={theme}
                        />
                    </Abs>
                    {Array.from({ length: content.lines }, (_, index) => (
                        <Abs
                            key={index}
                            x={SIDE}
                            y={56 + index * 13.5}
                            w={BODY_W}
                            h={13}
                        >
                            <span
                                style={{
                                    fontFamily: theme.monoFont,
                                    fontSize: mm(2.4),
                                    opacity: 0.6,
                                }}
                            >
                                {content.players} {index + 1}
                            </span>
                            <span
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    height: mm(0.2),
                                    background: theme.ink,
                                    opacity: 0.35,
                                }}
                            />
                        </Abs>
                    ))}
                    <Folio page={page} name={context.name} theme={theme} />
                </>
            );
    }
}

/** One page of the rules booklet (B123): A5 portrait, with bleed when the print shop asks for it. */
export function RulesBookletPage({
    page,
    context,
    photo,
    ...element
}: RulesBookletPageProps): ReactNode {
    const pages = bookletPages(context);
    const content = pages[page - 1];

    if (content === undefined) {
        return null;
    }

    const theme = THEMES[element.theme];

    return (
        <Sheet
            {...element}
            element="rules-booklet"
            widthMm={BOOKLET_PAGE.w}
            heightMm={BOOKLET_PAGE.h}
            background={
                content.kind === 'cover'
                    ? theme.boardBackground
                    : content.kind === 'back'
                      ? theme.cornerBackground
                      : theme.paper
            }
        >
            <PageFace
                content={content}
                page={page}
                context={context}
                photo={photo}
            />
        </Sheet>
    );
}
