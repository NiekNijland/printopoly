import { useId } from 'react';

import {
    cutCornerBox,
    ellipsePath,
    notchedBanner,
} from '@/lib/render/banknote-guilloche';
import { notePaperLight } from '@/lib/render/banknote-pattern';
import { NOTE_NAME_BOX } from '@/lib/render/name-boxes';
import type { PhotoSource } from '@/lib/render/photo';
import { PLAYFAIR } from '@/lib/render/themes';

import { NoteSvg, useNoteWords } from './banknote-parts';
import {
    FullPhoto,
    NOTE_H,
    NOTE_W,
    inkOf,
    type StyledNoteProps,
} from './banknote-styles-shared';
import {
    VintageAmount,
    VintageFramedAmount,
} from './banknote-styles-vintage-amount';
import { VINTAGE, VintageGuilloche } from './banknote-styles-vintage-lines';
import { FitText } from './fit-text';
import { PhotoSlot, isFullPhoto } from './photo-slot';
import { Abs, useRender } from './sheet';

type Inks = { ink: string; light: string };

const VintageFrames = ({ ink }: { ink: string }) => (
    <g fill="none" stroke={ink}>
        <rect
            x={VINTAGE.outer}
            y={VINTAGE.outer}
            width={NOTE_W - 2 * VINTAGE.outer}
            height={NOTE_H - 2 * VINTAGE.outer}
            strokeWidth={0.4}
            data-frame=""
        />
        <rect
            x={VINTAGE.inner}
            y={VINTAGE.inner}
            width={NOTE_W - 2 * VINTAGE.inner}
            height={NOTE_H - 2 * VINTAGE.inner}
            strokeWidth={0.3}
            data-frame=""
        />
        <rect
            x={VINTAGE.hairline}
            y={VINTAGE.hairline}
            width={NOTE_W - 2 * VINTAGE.hairline}
            height={NOTE_H - 2 * VINTAGE.hairline}
            strokeWidth={0.12}
        />
    </g>
);

const VintageCartouches = ({ ink, light }: Inks) => {
    const { corners } = VINTAGE;

    return (
        <>
            {corners.map(({ box }) => (
                <g key={`${box.x}-${box.y}`}>
                    <path
                        d={cutCornerBox(box, 1.7)}
                        fill={light}
                        stroke={ink}
                        strokeWidth={0.38}
                        data-corner=""
                    />
                    <path
                        d={cutCornerBox(
                            {
                                x: box.x + 0.8,
                                y: box.y + 0.8,
                                w: box.w - 1.6,
                                h: box.h - 1.6,
                            },
                            1.25,
                        )}
                        fill="none"
                        stroke={ink}
                        strokeWidth={0.12}
                    />
                </g>
            ))}
        </>
    );
};

const VintageOrnaments = ({
    ink,
    light,
    hasEdition,
}: Inks & { hasEdition: boolean }) => {
    const { banner, oval, plaque } = VINTAGE;
    const bannerD = notchedBanner(banner, 1.9);

    return (
        <NoteSvg slot="ornaments">
            <VintageFrames ink={ink} />
            <path
                d={ellipsePath(oval.cx, oval.cy, oval.rx, oval.ry)}
                fill={light}
                stroke={ink}
                strokeWidth={0.5}
                data-oval=""
            />
            <path
                d={ellipsePath(
                    oval.cx,
                    oval.cy,
                    oval.rx - 1.45,
                    oval.ry - 1.45,
                )}
                fill="none"
                stroke={ink}
                strokeWidth={0.14}
            />
            <VintageCartouches ink={ink} light={light} />
            <path
                d={bannerD}
                fill={light}
                stroke={ink}
                strokeWidth={0.38}
                data-slot="banner"
            />
            <path
                d={notchedBanner(
                    {
                        x: banner.x + 1.2,
                        y: banner.y + 0.7,
                        w: banner.w - 2.4,
                        h: banner.h - 1.4,
                    },
                    1.5,
                )}
                fill="none"
                stroke={ink}
                strokeWidth={0.12}
            />
            {hasEdition && (
                <path
                    d={cutCornerBox(plaque, 1.2)}
                    fill={light}
                    stroke={ink}
                    strokeWidth={0.25}
                />
            )}
        </NoteSvg>
    );
};

const VintageOvalPhoto = ({ photo }: { photo: PhotoSource }) => {
    const { oval } = VINTAGE;

    return (
        <Abs
            x={oval.cx - oval.rx + 1.9}
            y={oval.cy - oval.ry + 1.9}
            w={2 * (oval.rx - 1.9)}
            h={2 * (oval.ry - 1.9)}
            style={{ borderRadius: '50%', overflow: 'hidden' }}
            slot="oval-photo"
        >
            <PhotoSlot
                x={0}
                y={0}
                w={2 * (oval.rx - 1.9)}
                h={2 * (oval.ry - 1.9)}
                photo={photo}
            />
        </Abs>
    );
};

const VintageNames = ({
    value,
    ink,
    title,
    noteName,
    hasEdition,
}: {
    value: number;
    ink: string;
    title: string;
    noteName: string;
    hasEdition: boolean;
}) => {
    const { banner, plaque, corners } = VINTAGE;

    return (
        <>
            {corners.map(({ box }, index) => (
                <FitText
                    key={index}
                    text={String(value)}
                    x={box.x + 1.5}
                    y={box.y + 1.4}
                    w={box.w - 3}
                    h={box.h - 2.8}
                    maxFontMm={6.5}
                    minFontMm={2.5}
                    font="heading"
                    family={PLAYFAIR}
                    weight={700}
                    color={ink}
                    align="center"
                    slot="corner-value"
                />
            ))}
            <FitText
                text={title}
                x={banner.x + 4.2}
                y={banner.y + 1}
                w={banner.w - 8.4}
                h={banner.h - 2}
                maxFontMm={3.8}
                minFontMm={NOTE_NAME_BOX.minFontMm}
                wrap="words"
                lineHeight={NOTE_NAME_BOX.lineHeight}
                font="heading"
                family={PLAYFAIR}
                weight={700}
                caps
                letterSpacingEm={0.08}
                color={ink}
                align="center"
                slot="edition-name"
                clip
            />
            {hasEdition && (
                <FitText
                    // An own currency ("Kus") gives the note its name; else it says "speelgeld" (UX 4).
                    text={noteName}
                    x={plaque.x + 1.5}
                    y={plaque.y + 0.5}
                    w={plaque.w - 3}
                    h={plaque.h - 1}
                    maxFontMm={2.3}
                    minFontMm={1.5}
                    font="body"
                    weight={600}
                    caps
                    letterSpacingEm={0.12}
                    color={ink}
                    align="center"
                    slot="play-money"
                />
            )}
        </>
    );
};

export const VintageNoteFace = ({
    value,
    paper,
    bankName,
    editionName,
    photo,
}: StyledNoteProps) => {
    const { theme } = useRender();
    const clipId = `note-vintage-${useId().replace(/:/g, '')}`;
    const { money, bank, bankSlot, noteName, hasEdition, title } = useNoteWords(
        value,
        bankName,
        editionName,
    );
    const ink = inkOf(theme, paper);
    const light = notePaperLight(paper, theme.paper);
    const riso = theme.id === 'riso';
    // As on the theme's note: Riso prints the line work in its second drum, Gala in gold (B84, B247).
    const patternInk = riso || theme.id === 'gala' ? theme.accent : ink;
    const full = isFullPhoto(photo);
    const framed = photo !== undefined && !full;
    const amount = { ink, light, amount: money(value), bank, bankSlot };

    return (
        <>
            {full && (
                <FullPhoto field={VINTAGE.field} photo={photo} light={light} />
            )}
            <VintageGuilloche
                paper={paper}
                patternInk={patternInk}
                full={full}
                riso={riso}
                clipId={clipId}
            />
            <VintageOrnaments ink={ink} light={light} hasEdition={hasEdition} />
            {framed && <VintageOvalPhoto photo={photo} />}
            {framed ? (
                <VintageFramedAmount {...amount} />
            ) : (
                <VintageAmount {...amount} />
            )}
            <VintageNames
                value={value}
                ink={ink}
                title={title}
                noteName={noteName}
                hasEdition={hasEdition}
            />
        </>
    );
};
