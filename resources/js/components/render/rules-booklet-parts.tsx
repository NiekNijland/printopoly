import type { CSSProperties, ReactNode } from 'react';

import { BOOKLET_TITLE_BOX } from '@/lib/render/name-boxes';
import { BOOKLET_PAGE } from '@/lib/render/print-extras';
import type { RulesBlock } from '@/lib/render/rules-booklet';
import type { Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { FitText } from './fit-text';
import { InkBar } from './ink-bar';
import { Abs, Frame, useRender } from './sheet';

/** The colour the booklet uses for kickers and rules: the accent of the theme, or its second one when that is plain ink. */
export const brandColor = (theme: Theme): string => {
    return theme.accent === theme.ink ? theme.secondaryAccent : theme.accent;
};

export const SIDE = 13;
export const BODY_W = BOOKLET_PAGE.w - 2 * SIDE;

export const Body = ({
    blocks,
    theme,
    size = 4.2,
}: {
    blocks: RulesBlock[];
    theme: Theme;
    size?: number;
}) => {
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
                    <BlockList
                        key={index}
                        items={block.items}
                        numbered={block.numbered === true}
                        base={base}
                        theme={theme}
                    />
                );
            })}
        </div>
    );
};

const BlockList = ({
    items,
    numbered,
    base,
    theme,
}: {
    items: readonly string[];
    numbered: boolean;
    base: CSSProperties;
    theme: Theme;
}) => {
    return (
        <ul
            style={{
                ...base,
                listStyle: 'none',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: mm(1.4),
            }}
        >
            {items.map((item, itemIndex) => (
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
                            width: mm(numbered ? 5.6 : 2.4),
                            height: mm(numbered ? 5.6 : 2.4),
                            marginTop: mm(numbered ? 0.1 : 1.7),
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
                        {numbered ? itemIndex + 1 : ''}
                    </span>
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
};

const Header = ({
    kicker,
    title,
    theme,
}: {
    kicker: string;
    title: string;
    theme: Theme;
}) => {
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
};

export const Folio = ({
    page,
    name,
    theme,
}: {
    page: number;
    name: string;
    theme: Theme;
}) => {
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
};

export const Lines = ({
    count,
    top,
    theme,
    step = 8.5,
}: {
    count: number;
    top: number;
    theme: Theme;
    step?: number;
}) => {
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
};

export const ChapterPage = ({
    kicker,
    title,
    page,
    name,
    children,
}: {
    kicker: string;
    title: string;
    page: number;
    name: string;
    children: ReactNode;
}) => {
    const { theme } = useRender();
    const { w, h } = BOOKLET_PAGE;

    return (
        <>
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
            <Header kicker={kicker} title={title} theme={theme} />
            {children}
            <Folio page={page} name={name} theme={theme} />
        </>
    );
};
