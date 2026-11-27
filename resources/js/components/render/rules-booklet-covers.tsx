import { BOOKLET_COVER_BOX } from '@/lib/render/name-boxes';
import type { PhotoSource } from '@/lib/render/photo';
import { BOOKLET_PAGE } from '@/lib/render/print-extras';
import type {
    BookletPageContent,
    RulesContext,
} from '@/lib/render/rules-booklet';
import { mm } from '@/lib/render/units';

import { FitText } from './fit-text';
import { Icon } from './icons';
import { InkBar } from './ink-bar';
import { PhotoSlot } from './photo-slot';
import { BODY_W, SIDE, brandColor } from './rules-booklet-parts';
import { Abs, Frame, useRender } from './sheet';

export const CoverFace = ({
    content,
    context,
    photo,
}: {
    content: Extract<BookletPageContent, { kind: 'cover' }>;
    context: RulesContext;
    photo?: PhotoSource;
}) => {
    const { theme } = useRender();
    const { w, h } = BOOKLET_PAGE;
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
            <CoverPicture photo={photo} />
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
                    {/* As many players as the money in the box is for, like the page inside (B254, Aisha). */}
                    {context.locale === 'nl'
                        ? `Een spel voor 2 tot ${String(context.money?.maxPlayers ?? 8)} spelers`
                        : `A game for 2 to ${String(context.money?.maxPlayers ?? 8)} players`}
                </span>
            </Abs>
            <InkBar x={SIDE} y={h - 16} w={30} theme={theme} />
        </>
    );
};

const CoverPicture = ({ photo }: { photo?: PhotoSource }) => {
    const { theme } = useRender();

    return photo !== undefined ? (
        <PhotoSlot x={SIDE} y={66} w={BODY_W} h={102} photo={photo} />
    ) : (
        <>
            {(['pawn', 'chest', 'train', 'car'] as const).map((name, index) => (
                <Icon
                    key={name}
                    name={name}
                    x={SIDE + 1 + index * 31}
                    y={118}
                    size={27}
                    color={index % 2 === 0 ? theme.ink : brandColor(theme)}
                    strokeWidth={1.3}
                />
            ))}
        </>
    );
};

export const BackFace = ({
    content,
}: {
    content: Extract<BookletPageContent, { kind: 'back' }>;
}) => {
    const { theme } = useRender();
    const { w, h } = BOOKLET_PAGE;

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
};
