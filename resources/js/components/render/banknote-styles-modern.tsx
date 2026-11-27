import { notePaperLight, type Rect } from '@/lib/render/banknote-pattern';
import { readableOn } from '@/lib/render/color';
import { NOTE_NAME_BOX } from '@/lib/render/name-boxes';
import type { PhotoSource } from '@/lib/render/photo';
import { SPARTAN } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { NoteSvg, tint, useNoteWords } from './banknote-parts';
import {
    FRAME_INSET,
    FullPhoto,
    NOTE_H,
    NOTE_W,
    inkOf,
    type StyledNoteProps,
} from './banknote-styles-shared';
import { FitText } from './fit-text';
import { PhotoSlot, isFullPhoto } from './photo-slot';
import { Abs, useRender } from './sheet';

const MODERN = {
    frame: {
        x: FRAME_INSET,
        y: FRAME_INSET,
        w: NOTE_W - 2 * FRAME_INSET,
        h: NOTE_H - 2 * FRAME_INSET,
    },
    disc: 38,
    chip: { x: 9, y: 8.6, w: 15, h: 6.2 },
    numeral: { x: 8.5, y: 18.5, w: 72, h: 33 },
    panel: { x: 86, y: 8.6, w: 35.4, h: 42.8 },
    photo: { x: 52, y: 8.6, w: 30, h: 42.8 },
} as const;

const ModernField = ({
    paper,
    photo,
    ink,
    light,
    left,
}: {
    paper: string;
    photo: PhotoSource | undefined;
    ink: string;
    light: string;
    left: Rect;
}) => {
    const { frame, chip, panel, disc } = MODERN;
    const shade = tint(ink, paper, 0.82);
    const full = isFullPhoto(photo);
    const framed = photo !== undefined && !full;

    return (
        <>
            {full ? (
                <FullPhoto field={left} photo={photo} light={light} />
            ) : (
                <NoteSvg slot="colour-field">
                    <path
                        d={`M${frame.x} ${frame.y}H${frame.x + disc}A${disc} ${disc} 0 0 1 ${frame.x} ${frame.y + disc}Z`}
                        fill={shade}
                        data-slot="quarter"
                    />
                </NoteSvg>
            )}
            {framed && (
                <PhotoSlot
                    x={MODERN.photo.x}
                    y={MODERN.photo.y}
                    w={MODERN.photo.w}
                    h={MODERN.photo.h}
                    photo={photo}
                />
            )}
            <Abs
                x={panel.x}
                y={panel.y}
                w={panel.w}
                h={panel.h}
                style={{ background: light }}
                slot="panel"
            />
            <Abs
                x={frame.x}
                y={frame.y}
                w={frame.w}
                h={frame.h}
                style={{
                    border: `${mm(0.6)} solid ${ink}`,
                    boxSizing: 'border-box',
                }}
                slot="frame"
            />
            <Abs
                x={chip.x}
                y={chip.y}
                w={chip.w}
                h={chip.h}
                style={{ background: ink }}
            />
        </>
    );
};

const ModernNumbers = ({
    value,
    ink,
    numeralW,
}: {
    value: number;
    ink: string;
    numeralW: number;
}) => {
    const { chip, numeral } = MODERN;

    return (
        <>
            <FitText
                text={String(value)}
                x={chip.x + 1}
                y={chip.y + 0.4}
                w={chip.w - 2}
                h={chip.h - 0.8}
                maxFontMm={5}
                minFontMm={2.4}
                font="heading"
                family={SPARTAN}
                weight={800}
                color={readableOn(ink)}
                align="center"
                slot="corner-value"
            />
            <FitText
                text={String(value)}
                x={numeral.x}
                y={numeral.y}
                w={numeralW}
                h={numeral.h}
                maxFontMm={44}
                minFontMm={6}
                font="heading"
                family={SPARTAN}
                weight={800}
                letterSpacingEm={-0.04}
                lineHeight={0.86}
                color={ink}
                align="left"
                valign="bottom"
                slot="corner-value"
            />
        </>
    );
};

const ModernTitle = ({
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
    const { panel } = MODERN;

    return (
        <>
            <FitText
                text={title}
                x={panel.x + 3}
                y={panel.y + 25}
                w={panel.w - 6}
                h={hasEdition ? 11 : 15}
                maxFontMm={hasEdition ? 4.2 : 5}
                minFontMm={NOTE_NAME_BOX.minFontMm}
                wrap="words"
                lineHeight={NOTE_NAME_BOX.lineHeight}
                font="heading"
                family={SPARTAN}
                weight={800}
                color={ink}
                align="left"
                valign="bottom"
                slot="edition-name"
                clip
            />
            {hasEdition && (
                <FitText
                    text={noteName}
                    x={panel.x + 3}
                    y={panel.y + 37}
                    w={panel.w - 6}
                    h={3.6}
                    maxFontMm={2.4}
                    minFontMm={1.5}
                    font="body"
                    weight={600}
                    caps
                    letterSpacingEm={0.08}
                    color={ink}
                    align="left"
                    slot="play-money"
                />
            )}
        </>
    );
};

const ModernPanel = ({
    amount,
    bank,
    bankSlot,
    noteName,
    hasEdition,
    title,
    ink,
    bar,
}: {
    amount: string;
    bank: string;
    bankSlot: string;
    noteName: string;
    hasEdition: boolean;
    title: string;
    ink: string;
    bar: string;
}) => {
    const { panel } = MODERN;

    return (
        <>
            <FitText
                text={bank}
                x={panel.x + 3}
                y={panel.y + 2.2}
                w={panel.w - 6}
                h={5.6}
                maxFontMm={2.6}
                minFontMm={1.4}
                wrap="words"
                lineHeight={1.1}
                font="body"
                weight={600}
                caps
                letterSpacingEm={0.08}
                color={ink}
                align="left"
                slot={bankSlot}
                clip
            />
            <Abs
                x={panel.x + 3}
                y={panel.y + 8.8}
                w={8}
                h={1.3}
                style={{ background: bar }}
                slot="bar"
            />
            <FitText
                text={amount}
                x={panel.x + 3}
                y={panel.y + 11}
                w={panel.w - 6}
                h={11}
                maxFontMm={9.5}
                minFontMm={3}
                font="heading"
                family={SPARTAN}
                weight={800}
                letterSpacingEm={-0.02}
                color={ink}
                align="left"
                slot="value"
            />
            <ModernTitle
                title={title}
                noteName={noteName}
                hasEdition={hasEdition}
                ink={ink}
            />
        </>
    );
};

export const ModernNoteFace = ({
    value,
    paper,
    bankName,
    editionName,
    photo,
}: StyledNoteProps) => {
    const { theme } = useRender();
    const { frame, numeral, panel } = MODERN;
    const { money, bank, bankSlot, noteName, hasEdition, title } = useNoteWords(
        value,
        bankName,
        editionName,
    );
    const ink = inkOf(theme, paper);
    const light = notePaperLight(paper, theme.paper);
    const framed = photo !== undefined && !isFullPhoto(photo);
    const left = {
        x: frame.x,
        y: frame.y,
        w: panel.x - 2.4 - frame.x,
        h: frame.h,
    };
    const numeralW = framed ? MODERN.photo.x - 2.5 - numeral.x : numeral.w;
    // A bar in the accent of the theme (magenta in Riso, gold in Gala); where the accent is the ink, the note's ink.
    const bar = theme.accent === theme.ink ? ink : theme.accent;

    return (
        <>
            <ModernField
                paper={paper}
                photo={photo}
                ink={ink}
                light={light}
                left={left}
            />
            <ModernNumbers value={value} ink={ink} numeralW={numeralW} />
            <ModernPanel
                amount={money(value)}
                bank={bank}
                bankSlot={bankSlot}
                noteName={noteName}
                hasEdition={hasEdition}
                title={title}
                ink={ink}
                bar={bar}
            />
        </>
    );
};
