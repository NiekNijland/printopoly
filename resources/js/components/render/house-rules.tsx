import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { THEMES } from '@/lib/render/themes';

import { FitText } from './fit-text';
import { CARD_SIZE_MM } from './game-card';
import { PhotoSlot } from './photo-slot';
import { Frame, Sheet, useRender, type ElementProps } from './sheet';

export interface HouseRulesCardProps extends ElementProps {
    /** One rule per line. */
    text: string;
    editionName: string;
    photo?: PhotoSource;
    placeholder?: boolean;
}

/** The rules as numbered lines; empty lines are dropped. */
export function houseRuleLines(text: string): string[] {
    return text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '');
}

function RulesFace({
    text,
    editionName,
    photo,
    placeholder,
}: {
    text: string;
    editionName: string;
    photo?: PhotoSource;
    placeholder: boolean;
}) {
    const { theme, locale } = useRender();
    const { width: w, height: h } = CARD_SIZE_MM;
    const hasPhoto = photo !== undefined || placeholder;
    const bodyTop = hasPhoto ? 49 : 24;
    const body = houseRuleLines(text)
        .map((line, index) => `${index + 1}. ${line}`)
        .join('\n');

    return (
        <>
            <Frame
                x={3}
                y={3}
                w={w - 6}
                h={h - 6}
                color={theme.ink}
                strokeMm={theme.frameMm}
                radiusMm={Math.max(0, theme.cardRadiusMm - 2)}
            />
            <FitText
                text={STRINGS[locale].houseRules}
                x={6}
                y={6}
                w={w - 12}
                h={10}
                maxFontMm={8}
                minFontMm={3}
                font="heading"
                align="center"
                slot="title"
            />
            <FitText
                text={editionName}
                x={6}
                y={16}
                w={w - 12}
                h={5}
                maxFontMm={3.4}
                minFontMm={2}
                font="body"
                align="center"
                slot="edition"
            />
            {hasPhoto && (
                <PhotoSlot
                    x={8}
                    y={23}
                    w={w - 16}
                    h={22}
                    photo={photo}
                    placeholder={placeholder ? '#CFC6B2' : undefined}
                />
            )}
            <FitText
                text={body}
                x={7}
                y={bodyTop}
                w={w - 14}
                h={h - bodyTop - 8}
                maxFontMm={4}
                minFontMm={2.2}
                wrap="words"
                font="body"
                align="left"
                valign="top"
                lineHeight={1.3}
                slot="text"
            />
        </>
    );
}

/** The house rules card (B99): one card at 63 x 88 mm with the rules a group agreed on. */
export function HouseRulesCard({
    text,
    editionName,
    photo,
    placeholder = false,
    ...element
}: HouseRulesCardProps) {
    const { width, height } = CARD_SIZE_MM;

    return (
        <Sheet
            {...element}
            element="house-rules"
            widthMm={width}
            heightMm={height}
            background={THEMES[element.theme].paper}
            rounded
        >
            <RulesFace
                text={text}
                editionName={editionName}
                photo={photo}
                placeholder={placeholder}
            />
        </Sheet>
    );
}
