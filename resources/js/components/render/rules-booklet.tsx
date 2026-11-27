import type { ReactNode } from 'react';

import type { PhotoSource } from '@/lib/render/photo';
import { BOOKLET_PAGE } from '@/lib/render/print-extras';
import {
    bookletPages,
    type BookletPageContent,
    type RulesContext,
} from '@/lib/render/rules-booklet';
import { THEMES } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { FitText } from './fit-text';
import { BackFace, CoverFace } from './rules-booklet-covers';
import { BODY_W, Body, ChapterPage, Lines, SIDE } from './rules-booklet-parts';
import { PriceTable } from './rules-booklet-prices';
import { Abs, Sheet, useRender, type ElementProps } from './sheet';

export type RulesBookletPageProps = {
    /** 1 to 16. */
    page: number;
    context: RulesContext;
    /** Photo on the cover. */
    photo?: PhotoSource;
} & ElementProps;

const PageFace = ({
    content,
    page,
    context,
    photo,
}: {
    content: BookletPageContent;
    page: number;
    context: RulesContext;
    photo?: PhotoSource;
}) => {
    const { theme } = useRender();
    const { h } = BOOKLET_PAGE;

    switch (content.kind) {
        case 'cover':
            return (
                <CoverFace content={content} context={context} photo={photo} />
            );
        case 'back':
            return <BackFace content={content} />;
        case 'text':
            return (
                <ChapterPage
                    kicker={content.kicker}
                    title={content.title}
                    page={page}
                    name={context.name}
                >
                    <Abs x={SIDE} y={41} w={BODY_W} h={h - 41 - 20}>
                        <Body blocks={content.blocks} theme={theme} />
                    </Abs>
                </ChapterPage>
            );
        case 'prices':
            return (
                <ChapterPage
                    kicker={content.kicker}
                    title={content.title}
                    page={page}
                    name={context.name}
                >
                    <Abs x={SIDE} y={39} w={BODY_W} h={h - 39 - 18}>
                        <PriceTable content={content} theme={theme} />
                    </Abs>
                </ChapterPage>
            );
        case 'houseRules':
            return (
                <HouseRulesFace
                    content={content}
                    page={page}
                    context={context}
                />
            );
        case 'notes':
            return (
                <NotesFace content={content} page={page} context={context} />
            );
    }
};

const HouseRulesFace = ({
    content,
    page,
    context,
}: {
    content: Extract<BookletPageContent, { kind: 'houseRules' }>;
    page: number;
    context: RulesContext;
}) => {
    const { theme } = useRender();
    const { h } = BOOKLET_PAGE;
    const written = content.rules.map((rule, index) => `${index + 1}. ${rule}`);

    return (
        <ChapterPage
            kicker={content.kicker}
            title={content.title}
            page={page}
            name={context.name}
        >
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
        </ChapterPage>
    );
};

const NotesFace = ({
    content,
    page,
    context,
}: {
    content: Extract<BookletPageContent, { kind: 'notes' }>;
    page: number;
    context: RulesContext;
}) => {
    const { theme } = useRender();

    return (
        <ChapterPage
            kicker={content.kicker}
            title={content.title}
            page={page}
            name={context.name}
        >
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
        </ChapterPage>
    );
};

/** One page of the rules booklet (B123): A5 portrait, with bleed when the print shop asks for it. */
export const RulesBookletPage = ({
    page,
    context,
    photo,
    ...element
}: RulesBookletPageProps): ReactNode => {
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
};
