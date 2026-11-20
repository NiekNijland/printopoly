import { standardEdition, formatMoney } from '@/lib/game/standard-edition';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { resolveLayout, type Layout } from '@/lib/render/themes';

import { FitText } from './fit-text';
import { PhotoSlot } from './photo-slot';
import { Frame, Sheet, useRender, type ElementProps } from './sheet';

/** Play money notes (B101): 130 x 60 mm, own frame instead of bleed. */
export const BANKNOTE_SIZE_MM = { w: 130, h: 60 } as const;

export interface BanknoteProps extends ElementProps {
    value: number;
    /** Paper colour of the note; defaults to the colour of this value in the game data. */
    color?: string;
    /** Name of the bank, the same on every note. */
    bankName?: string;
    layout?: Layout;
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
    layout,
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
                bankName={bankName}
                layout={resolveLayout(element.theme, 'banknote', layout)}
                photo={photo}
                placeholder={placeholder}
            />
        </Sheet>
    );
}

function NoteFace({
    value,
    bankName,
    layout,
    photo,
    placeholder,
}: {
    value: number;
    bankName?: string;
    layout: Layout;
    photo?: PhotoSource;
    placeholder: boolean;
}) {
    const { theme, locale, currency } = useRender();
    const { w, h } = BANKNOTE_SIZE_MM;
    const t = STRINGS[locale];
    const amount = formatMoney(value, currency, locale);
    const framed = layout === 'framed';
    const textX = 7;
    const textW = framed ? 40 : w - 14;

    return (
        <>
            <Frame
                x={2}
                y={2}
                w={w - 4}
                h={h - 4}
                color={theme.ink}
                strokeMm={theme.frameMm + 0.2}
            />
            <Frame
                x={4}
                y={4}
                w={w - 8}
                h={h - 8}
                color={theme.ink}
                strokeMm={0.2}
            />
            <FitText
                text={amount}
                x={textX}
                y={7}
                w={textW}
                h={framed ? 22 : 30}
                maxFontMm={framed ? 15 : 22}
                minFontMm={5}
                font="heading"
                align={framed ? 'left' : 'center'}
                slot="value"
            />
            {framed && (
                <PhotoSlot
                    x={52}
                    y={8}
                    w={70}
                    h={36}
                    photo={photo}
                    placeholder={placeholder ? '#CFC6B2' : undefined}
                />
            )}
            {bankName !== undefined && bankName !== '' && (
                <FitText
                    text={bankName}
                    x={textX}
                    y={framed ? 32 : 38}
                    w={textW}
                    h={8}
                    maxFontMm={3.8}
                    minFontMm={2}
                    font="body"
                    weight={600}
                    align={framed ? 'left' : 'center'}
                    slot="bank-name"
                />
            )}
            <FitText
                text={t.playMoney}
                x={framed ? 52 : textX}
                y={h - 14}
                w={framed ? 70 : textW}
                h={8}
                maxFontMm={5}
                minFontMm={3}
                font="heading"
                align={framed ? 'right' : 'center'}
                slot="play-money"
            />
        </>
    );
}
