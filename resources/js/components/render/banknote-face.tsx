import { useId } from 'react';

import {
    noteIcons,
    noteInk,
    notePaperLight,
    type PatternDensity,
} from '@/lib/render/banknote-pattern';
import { withAlpha } from '@/lib/render/color';
import { NOTE_NAME_BOX } from '@/lib/render/name-boxes';
import type { PhotoSource } from '@/lib/render/photo';
import { mm } from '@/lib/render/units';

import { NoteAmount, NoteFramedAmount } from './banknote-face-amount';
import {
    NOTE_LAYOUT,
    NoteGuilloche,
    noteHatches,
} from './banknote-face-guilloche';
import {
    BANKNOTE_SIZE_MM,
    NoteIcon,
    NoteSvg,
    useNoteWords,
} from './banknote-parts';
import { FitText } from './fit-text';
import { PhotoSlot, isFullPhoto } from './photo-slot';
import { Abs, Frame, useRender } from './sheet';

type Inks = { ink: string; light: string };

const NoteFullPhoto = ({
    photo,
    light,
}: {
    photo: PhotoSource | undefined;
    light: string;
}) => {
    const { field } = NOTE_LAYOUT;

    return (
        <>
            <PhotoSlot
                x={field.x}
                y={field.y}
                w={field.w}
                h={field.h}
                photo={photo}
            />
            {/* The pattern stays on top of a lightened photo (B137). */}
            <Abs
                x={field.x}
                y={field.y}
                w={field.w}
                h={field.h}
                style={{ background: withAlpha(light, 0.55) }}
                slot="photo-wash"
            />
        </>
    );
};

const NoteFrames = ({ ink }: { ink: string }) => {
    const { w, h } = BANKNOTE_SIZE_MM;
    const { theme } = useRender();

    return (
        <>
            <Frame
                x={NOTE_LAYOUT.outerInset}
                y={NOTE_LAYOUT.outerInset}
                w={w - 2 * NOTE_LAYOUT.outerInset}
                h={h - 2 * NOTE_LAYOUT.outerInset}
                color={ink}
                strokeMm={theme.frameMm + 0.15}
            />
            <Frame
                x={NOTE_LAYOUT.innerInset}
                y={NOTE_LAYOUT.innerInset}
                w={w - 2 * NOTE_LAYOUT.innerInset}
                h={h - 2 * NOTE_LAYOUT.innerInset}
                color={ink}
                strokeMm={0.25}
            />
        </>
    );
};

const NoteOrnaments = ({
    value,
    ink,
    light,
    density,
}: Inks & { value: number; density: PatternDensity }) => {
    const { oval } = NOTE_LAYOUT;
    const [firstIcon, secondIcon] = noteIcons(value);
    const [firstBox, secondBox] = NOTE_LAYOUT.iconBoxes;

    return (
        <NoteSvg slot="ornaments">
            <ellipse
                cx={oval.cx}
                cy={oval.cy}
                rx={oval.rx}
                ry={oval.ry}
                fill={light}
                stroke={ink}
                strokeWidth={0.5}
                data-oval=""
            />
            <ellipse
                cx={oval.cx}
                cy={oval.cy}
                rx={oval.rx - 1}
                ry={oval.ry - 1}
                fill="none"
                stroke={ink}
                strokeWidth={0.18}
            />
            <path
                d={noteHatches(density)}
                fill="none"
                stroke={ink}
                strokeWidth={0.12}
            />
            {[...NOTE_LAYOUT.valueBoxes, ...NOTE_LAYOUT.iconBoxes].map(
                (corner) => (
                    <g key={`${corner.box.x}-${corner.box.y}`}>
                        <rect
                            x={corner.hatch.x}
                            y={corner.hatch.y}
                            width={corner.hatch.w}
                            height={corner.hatch.h}
                            fill="none"
                            stroke={ink}
                            strokeWidth={0.2}
                        />
                        <rect
                            x={corner.box.x}
                            y={corner.box.y}
                            width={corner.box.w}
                            height={corner.box.h}
                            fill={light}
                            stroke={ink}
                            strokeWidth={0.35}
                            data-corner=""
                        />
                    </g>
                ),
            )}
            <NoteIcon
                key={firstIcon}
                name={firstIcon}
                box={firstBox.box}
                ink={ink}
                light={light}
            />
            <NoteIcon
                key={secondIcon}
                name={secondIcon}
                box={secondBox.box}
                ink={ink}
                light={light}
            />
        </NoteSvg>
    );
};

const NoteOvalPhoto = ({ photo }: { photo: PhotoSource }) => {
    const { oval } = NOTE_LAYOUT;

    return (
        <Abs
            x={oval.cx - oval.rx + 1.3}
            y={oval.cy - oval.ry + 1.3}
            w={2 * (oval.rx - 1.3)}
            h={2 * (oval.ry - 1.3)}
            style={{ borderRadius: '50%', overflow: 'hidden' }}
            slot="oval-photo"
        >
            <PhotoSlot
                x={0}
                y={0}
                w={2 * (oval.rx - 1.3)}
                h={2 * (oval.ry - 1.3)}
                photo={photo}
            />
        </Abs>
    );
};

const NoteCorners = ({ value, ink }: { value: number; ink: string }) => (
    <>
        {NOTE_LAYOUT.valueBoxes.map((corner, index) => (
            <FitText
                key={index}
                text={String(value)}
                x={corner.box.x + 1}
                y={corner.box.y + 1}
                w={corner.box.w - 2}
                h={corner.box.h - 2}
                maxFontMm={7}
                minFontMm={3}
                font="heading"
                color={ink}
                align="center"
                slot="corner-value"
            />
        ))}
    </>
);

const NoteStrip = ({
    ink,
    light,
    title,
    noteName,
    hasEdition,
}: Inks & { title: string; noteName: string; hasEdition: boolean }) => {
    const { theme } = useRender();
    const { strip } = NOTE_LAYOUT;
    const riso = theme.id === 'riso';

    return (
        <Abs
            x={strip.x}
            y={strip.y}
            w={strip.w}
            h={strip.h}
            style={{
                background: riso ? theme.accent : ink,
                // A rim of paper keeps the strip clear of the pattern around it.
                boxShadow: `0 0 0 0.6mm ${light}`,
            }}
            slot="strip"
        >
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: mm(strip.h),
                    width: mm(strip.h),
                    height: mm(strip.w),
                    transform: 'rotate(-90deg)',
                    transformOrigin: 'top left',
                }}
            >
                <FitText
                    text={title}
                    x={2.5}
                    y={hasEdition ? 1 : 1.5}
                    w={strip.h - 5}
                    h={hasEdition ? 6.2 : 8}
                    maxFontMm={hasEdition ? 5.5 : 6}
                    minFontMm={NOTE_NAME_BOX.minFontMm}
                    wrap="words"
                    lineHeight={NOTE_NAME_BOX.lineHeight}
                    font="heading"
                    color={light}
                    align="center"
                    slot="edition-name"
                    clip
                />
                {hasEdition && (
                    <FitText
                        // An own currency ("Kus") gives the notes its name; else they say "speelgeld" (UX 4).
                        text={noteName}
                        x={2.5}
                        y={7.2}
                        w={strip.h - 5}
                        h={2.8}
                        maxFontMm={2.3}
                        minFontMm={1.6}
                        font="body"
                        weight={600}
                        color={light}
                        align="center"
                        slot="play-money"
                    />
                )}
            </div>
        </Abs>
    );
};

export const NoteFace = ({
    value,
    paper,
    bankName,
    editionName,
    photo,
}: {
    value: number;
    paper: string;
    bankName?: string;
    editionName?: string;
    photo?: PhotoSource;
}) => {
    const { theme, money } = useRender();
    const clipId = `note-field-${useId().replace(/:/g, '')}`;
    const { bank, bankSlot, noteName, hasEdition, title } = useNoteWords(
        value,
        bankName,
        editionName,
    );
    const ink = noteInk(paper, theme.ink);
    const light = notePaperLight(paper, theme.paper);
    const density: PatternDensity = theme.id === 'strak' ? 'light' : 'full';
    const riso = theme.id === 'riso';
    // Riso prints the guilloche in its second drum, slightly off register (B84); Gala prints it in gold (B247).
    const patternInk = riso || theme.id === 'gala' ? theme.accent : ink;
    const full = isFullPhoto(photo);
    const framed = photo !== undefined && !full;
    const amount = { ink, light, amount: money(value), bank, bankSlot };

    return (
        <>
            {full && <NoteFullPhoto photo={photo} light={light} />}
            <NoteGuilloche
                paper={paper}
                patternInk={patternInk}
                density={density}
                riso={riso}
                full={full}
                clipId={clipId}
            />
            <NoteFrames ink={ink} />
            <NoteOrnaments
                value={value}
                ink={ink}
                light={light}
                density={density}
            />
            {framed && <NoteOvalPhoto photo={photo} />}
            {framed ? (
                <NoteFramedAmount {...amount} />
            ) : (
                <NoteAmount {...amount} />
            )}
            <NoteCorners value={value} ink={ink} />
            <NoteStrip
                ink={ink}
                light={light}
                title={title}
                noteName={noteName}
                hasEdition={hasEdition}
            />
        </>
    );
};
