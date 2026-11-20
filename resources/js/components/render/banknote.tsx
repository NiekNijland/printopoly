import { standardEdition, formatMoney } from '@/lib/game/standard-edition';
import { mix } from '@/lib/render/color';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';

import { FitText } from './fit-text';
import { PhotoSlot } from './photo-slot';
import { Abs, Frame, Sheet, useRender, type ElementProps } from './sheet';

/** Play money notes (B101): 130 x 60 mm, own frame instead of bleed. */
export const BANKNOTE_SIZE_MM = { w: 130, h: 60 } as const;

export interface BanknoteProps extends ElementProps {
    value: number;
    /** Paper colour of the note; defaults to the colour of this value in the game data. */
    color?: string;
    /** Name of the bank, the same on every note. */
    bankName?: string;
    photo?: PhotoSource;
    placeholder?: boolean;
}

/** The standard colour of a note value, from the game data. */
export function noteColor(value: number): string {
    return (
        standardEdition.money.notes.find((note) => note.value === value)
            ?.color ?? '#FFFDF7'
    );
}

/** A banknote of play money. It always shows the word "speelgeld" or "play money" (B85). */
export function Banknote({
    value,
    color,
    bankName,
    photo,
    placeholder = false,
    ...element
}: BanknoteProps) {
    return (
        <Sheet
            {...element}
            element="banknote"
            widthMm={BANKNOTE_SIZE_MM.w}
            heightMm={BANKNOTE_SIZE_MM.h}
            background={color ?? noteColor(value)}
        >
            <NoteFace
                value={value}
                color={color ?? noteColor(value)}
                bankName={bankName}
                photo={photo}
                placeholder={placeholder}
            />
        </Sheet>
    );
}

const HEX = /^#[0-9a-f]{6}$/i;

function NoteFace({
    value,
    color,
    bankName,
    photo,
    placeholder,
}: {
    value: number;
    color: string;
    bankName?: string;
    photo?: PhotoSource;
    placeholder: boolean;
}) {
    const { theme, locale, currency } = useRender();
    const { w, h } = BANKNOTE_SIZE_MM;
    const t = STRINGS[locale];
    const amount = formatMoney(value, currency, locale);
    const framed = photo !== undefined || placeholder;
    // Lines and text use a darker tone of the note's own colour; Strak stays in plain ink.
    const tone =
        theme.id === 'strak' || !HEX.test(color)
            ? theme.ink
            : mix(color, theme.ink, 0.75);
    const light = HEX.test(color) ? mix(color, '#FFFFFF', 0.35) : theme.paper;
    // Left panel with the face value, a divider, and the right half with photo and bank name.
    const panelW = 36;
    const rightX = 3 + panelW;
    const rightW = w - 3 - rightX;
    const circle = 24;
    const circleX = rightX + (rightW - circle) / 2;
    const hasName = bankName !== undefined && bankName !== '';

    return (
        <>
            <Frame
                x={3}
                y={3}
                w={w - 6}
                h={h - 6}
                color={tone}
                strokeMm={theme.frameMm + 0.2}
            />
            <Frame
                x={5}
                y={5}
                w={w - 10}
                h={h - 10}
                color={tone}
                strokeMm={0.2}
            />
            <Abs
                x={rightX}
                y={5}
                w={0}
                h={h - 10}
                style={{ borderLeft: `0.25mm solid ${tone}` }}
            />
            <FitText
                text={String(value)}
                x={6}
                y={h / 2 - 12}
                w={panelW - 6}
                h={18}
                maxFontMm={16}
                minFontMm={5}
                font="heading"
                color={tone}
                align="center"
                slot="value"
            />
            <FitText
                text={t.playMoney}
                x={6}
                y={h / 2 + 7}
                w={panelW - 6}
                h={5}
                maxFontMm={3.4}
                minFontMm={2.4}
                font="body"
                color={tone}
                align="center"
                slot="play-money"
            />
            <Abs
                x={circleX}
                y={framed ? 9 : 10}
                w={circle}
                h={circle}
                style={{
                    borderRadius: '50%',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    border: `0.5mm solid ${tone}`,
                    background: light,
                }}
            >
                {framed ? (
                    <PhotoSlot
                        x={0}
                        y={0}
                        w={circle}
                        h={circle}
                        photo={photo}
                        placeholder={placeholder ? '#CFC6B2' : undefined}
                    />
                ) : (
                    <FitText
                        text={amount}
                        x={2}
                        y={4}
                        w={circle - 4}
                        h={circle - 8}
                        maxFontMm={7}
                        minFontMm={3}
                        font="heading"
                        color={tone}
                        align="center"
                        slot="seal"
                    />
                )}
            </Abs>
            {hasName && (
                <FitText
                    text={bankName}
                    x={rightX + 4}
                    y={framed ? 36 : 37}
                    w={rightW - 8}
                    h={7}
                    maxFontMm={4.2}
                    minFontMm={2}
                    font="heading"
                    color={tone}
                    align="center"
                    slot="bank-name"
                />
            )}
            {framed && (
                <FitText
                    text={amount}
                    x={w - 3 - 32}
                    y={7}
                    w={28}
                    h={9}
                    maxFontMm={6.5}
                    minFontMm={3}
                    font="heading"
                    color={tone}
                    align="right"
                    slot="amount"
                />
            )}
        </>
    );
}
