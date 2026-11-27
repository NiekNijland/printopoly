import type { LidLayout, LidPhoto } from '@/lib/render/box-lid-layout';
import type { BoxLidStyle } from '@/lib/render/edition-part-styles';
import { STRINGS } from '@/lib/render/strings';
import type { Locale } from '@/types/game';

import { FitText } from './fit-text';
import { pieceText } from './piece-styles';
import { useRender } from './sheet';

export type LidWords = {
    line: string;
    own: string;
    subtitleFont: number;
    linesFont: number;
};

export const lidWords = (
    h: number,
    subtitle: string | undefined,
    lines: string | undefined,
    locale: Locale,
): LidWords => {
    return {
        line: subtitle ?? STRINGS[locale].boxLidSubtitle,
        own: lines?.trim() ?? '',
        // On a lid of 267 mm the subtitle was 5 mm high at most: too small to read on the box (R5-29, Sophie).
        subtitleFont: Math.min(10, Math.max(5, h * 0.034)),
        linesFont: Math.min(7, Math.max(5, h * 0.024)),
    };
};

export const LidLines = ({
    layout,
    look,
    words,
    ink,
}: {
    layout: LidLayout;
    look: BoxLidStyle | undefined;
    words: LidWords;
    ink?: string;
}) => {
    const lineText = pieceText(look, 'line');

    return (
        <>
            {layout.subtitle !== undefined && (
                <FitText
                    text={words.line}
                    {...layout.subtitle}
                    maxFontMm={words.subtitleFont}
                    minFontMm={3.5}
                    font="body"
                    {...lineText}
                    align="center"
                    color={ink}
                    slot="subtitle"
                />
            )}
            {layout.lines !== undefined && (
                <FitText
                    text={words.own}
                    {...layout.lines}
                    maxFontMm={words.linesFont}
                    minFontMm={3}
                    wrap="words"
                    font="body"
                    align="center"
                    lineHeight={1.3}
                    color={ink}
                    slot="lines"
                />
            )}
        </>
    );
};

export const LidTitleText = ({
    editionName,
    layout,
    look,
    mode,
    ink,
    words,
}: {
    editionName: string;
    layout: LidLayout;
    look: BoxLidStyle | undefined;
    mode: LidPhoto;
    ink: string | undefined;
    words: LidWords;
}) => {
    const { theme } = useRender();

    return (
        <>
            <FitText
                text={editionName}
                {...layout.title}
                maxFontMm={24 * (look === undefined ? theme.titleScale : 1)}
                minFontMm={6}
                font="title"
                {...pieceText(look, 'name')}
                align="center"
                color={mode === 'full' ? ink : theme.accent}
                slot="edition-name"
            />
            <LidLines layout={layout} look={look} words={words} ink={ink} />
        </>
    );
};
