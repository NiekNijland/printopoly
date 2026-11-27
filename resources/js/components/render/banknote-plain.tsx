import { readableOn } from '@/lib/render/color';
import { NOTE_NAME_BOX } from '@/lib/render/name-boxes';
import type { PhotoSource } from '@/lib/render/photo';

import { BANKNOTE_SIZE_MM, useNoteWords } from './banknote-parts';
import { FitText } from './fit-text';
import { PhotoSlot, isFullPhoto } from './photo-slot';
import { Abs, Frame, useRender } from './sheet';

/** Where the parts of a Strak note go, in mm (B255). */
const PLAIN = {
    inset: 2.5,
    block: { x: 2.5, y: 2.5, w: 36, h: 55 },
    text: { x: 44, w: 80 },
    photo: { x: 96, y: 6, w: 28, h: 30 },
} as const;

const PlainBlock = ({
    color,
    photo,
    ink,
}: {
    color: string;
    photo: PhotoSource | undefined;
    ink: string;
}) => {
    const { w, h } = BANKNOTE_SIZE_MM;
    const { block } = PLAIN;
    const full = isFullPhoto(photo);
    const framed = photo !== undefined && !full;

    return (
        <>
            {full ? (
                <PhotoSlot
                    x={block.x}
                    y={block.y}
                    w={block.w}
                    h={block.h}
                    photo={photo}
                />
            ) : (
                <Abs
                    x={block.x}
                    y={block.y}
                    w={block.w}
                    h={block.h}
                    style={{ background: color }}
                    slot="value-block"
                />
            )}
            {framed && (
                <>
                    <PhotoSlot
                        x={PLAIN.photo.x}
                        y={PLAIN.photo.y}
                        w={PLAIN.photo.w}
                        h={PLAIN.photo.h}
                        photo={photo}
                    />
                    <Frame
                        x={PLAIN.photo.x}
                        y={PLAIN.photo.y}
                        w={PLAIN.photo.w}
                        h={PLAIN.photo.h}
                        color={ink}
                        strokeMm={0.25}
                    />
                </>
            )}
            <Frame
                x={PLAIN.inset}
                y={PLAIN.inset}
                w={w - 2 * PLAIN.inset}
                h={h - 2 * PLAIN.inset}
                color={ink}
                strokeMm={0.3}
            />
        </>
    );
};

const PlainNumber = ({
    value,
    color,
    full,
}: {
    value: number;
    color: string;
    full: boolean;
}) => {
    const { block } = PLAIN;
    const numberInk = readableOn(color);

    return full ? (
        <>
            <Abs
                x={block.x}
                y={block.y + block.h - 13}
                w={block.w}
                h={13}
                style={{ background: color }}
            />
            <FitText
                text={String(value)}
                x={block.x + 2}
                y={block.y + block.h - 12}
                w={block.w - 4}
                h={11}
                maxFontMm={10}
                minFontMm={3}
                font="heading"
                color={numberInk}
                align="left"
                slot="corner-value"
            />
        </>
    ) : (
        <FitText
            text={String(value)}
            x={block.x + 3}
            y={block.y + 3}
            w={block.w - 6}
            h={block.h - 6}
            maxFontMm={24}
            minFontMm={4}
            font="heading"
            color={numberInk}
            align="left"
            valign="bottom"
            lineHeight={0.9}
            slot="corner-value"
        />
    );
};

const PlainEdition = ({
    title,
    noteName,
    hasEdition,
    ink,
}: {
    title: string;
    noteName: string;
    hasEdition: boolean;
    ink: string;
}) => {
    const { h } = BANKNOTE_SIZE_MM;
    const { text } = PLAIN;

    return (
        <>
            <Abs
                x={text.x}
                y={h - 16}
                w={text.w}
                h={0.25}
                style={{ background: ink }}
            />
            <FitText
                text={title}
                x={text.x}
                y={h - 14}
                w={text.w - 24}
                h={8}
                maxFontMm={4.6}
                minFontMm={NOTE_NAME_BOX.minFontMm}
                wrap="words"
                lineHeight={NOTE_NAME_BOX.lineHeight}
                font="heading"
                color={ink}
                align="left"
                slot="edition-name"
                clip
            />
            {hasEdition && (
                <FitText
                    text={noteName}
                    x={text.x + text.w - 24}
                    y={h - 14}
                    w={24}
                    h={8}
                    maxFontMm={2.6}
                    minFontMm={1.6}
                    font="body"
                    weight={600}
                    color={ink}
                    align="right"
                    slot="play-money"
                />
            )}
        </>
    );
};

const PlainWords = ({
    amount,
    bank,
    bankSlot,
    title,
    noteName,
    hasEdition,
    amountW,
}: {
    amount: string;
    bank: string;
    bankSlot: string;
    title: string;
    noteName: string;
    hasEdition: boolean;
    amountW: number;
}) => {
    const { theme } = useRender();
    const { text } = PLAIN;
    const ink = theme.ink;

    return (
        <>
            <FitText
                text={bank}
                x={text.x}
                y={6.5}
                w={amountW}
                h={4.5}
                maxFontMm={3.4}
                minFontMm={1.6}
                font="body"
                weight={600}
                color={ink}
                align="left"
                slot={bankSlot}
                clip
            />
            <FitText
                text={amount}
                x={text.x}
                y={14}
                w={amountW}
                h={20}
                maxFontMm={17}
                minFontMm={5}
                font="heading"
                color={ink}
                align="left"
                slot="value"
            />
            <PlainEdition
                title={title}
                noteName={noteName}
                hasEdition={hasEdition}
                ink={ink}
            />
        </>
    );
};

/**
 * The Strak note (B255): no guilloche, ornaments or icons. White paper in a thin ink frame, the colour of the value
 * as one block on the left with the number, and on the right the bank, the amount and the name of the edition in
 * plain type, like a ticket. A photo goes in the block (whole note) or in a frame top right.
 */
export const PlainNoteFace = ({
    value,
    color,
    bankName,
    editionName,
    photo,
}: {
    value: number;
    color: string;
    bankName?: string;
    editionName?: string;
    photo?: PhotoSource;
}) => {
    const { theme, money } = useRender();
    const { text } = PLAIN;
    const ink = theme.ink;
    const full = isFullPhoto(photo);
    const framed = photo !== undefined && !full;
    const { bank, bankSlot, noteName, hasEdition, title } = useNoteWords(
        value,
        bankName,
        editionName,
    );
    const amountW = framed ? PLAIN.photo.x - text.x - 3 : text.w;

    return (
        <>
            <PlainBlock color={color} photo={photo} ink={ink} />
            <PlainNumber value={value} color={color} full={full} />
            <PlainWords
                amount={money(value)}
                bank={bank}
                bankSlot={bankSlot}
                title={title}
                noteName={noteName}
                hasEdition={hasEdition}
                amountW={amountW}
            />
        </>
    );
};
