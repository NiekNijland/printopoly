import { notePaperLight } from '@/lib/render/banknote-pattern';
import { readableOn } from '@/lib/render/color';
import { NOTE_NAME_BOX } from '@/lib/render/name-boxes';
import type { PhotoSource } from '@/lib/render/photo';
import { SPARTAN } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { useNoteWords } from './banknote-parts';
import { PLAYFUL, PlayfulArt } from './banknote-styles-playful-art';
import {
    FullPhoto,
    inkOf,
    type StyledNoteProps,
} from './banknote-styles-shared';
import { FitText } from './fit-text';
import { PhotoSlot, isFullPhoto } from './photo-slot';
import { Abs, useRender } from './sheet';

type AmountProps = {
    amount: string;
    bank: string;
    bankSlot: string;
    ink: string;
    light: string;
};

const PlayfulBadgePhoto = ({ photo }: { photo: PhotoSource }) => {
    const { badge } = PLAYFUL;

    return (
        <Abs
            x={badge.cx - badge.r + 1.2}
            y={badge.cy - badge.r + 1.2}
            w={2 * (badge.r - 1.2)}
            h={2 * (badge.r - 1.2)}
            style={{ borderRadius: '50%', overflow: 'hidden' }}
            slot="oval-photo"
        >
            <PhotoSlot
                x={0}
                y={0}
                w={2 * (badge.r - 1.2)}
                h={2 * (badge.r - 1.2)}
                photo={photo}
            />
        </Abs>
    );
};

const PlayfulValues = ({ value, ink }: { value: number; ink: string }) => {
    const { bubbles, bubbleR } = PLAYFUL;

    return (
        <>
            {bubbles
                .filter((bubble) => bubble.kind === 'value')
                .map((bubble) => (
                    <FitText
                        key={`${bubble.cx}-${bubble.cy}`}
                        text={String(value)}
                        x={bubble.cx - bubbleR + 1.4}
                        y={bubble.cy - 3}
                        w={2 * bubbleR - 2.8}
                        h={6}
                        maxFontMm={5}
                        minFontMm={2.2}
                        font="heading"
                        family={SPARTAN}
                        weight={800}
                        color={readableOn(ink)}
                        align="center"
                        slot="corner-value"
                    />
                ))}
        </>
    );
};

const PlayfulFramedAmount = ({
    amount,
    bank,
    bankSlot,
    ink,
    light,
}: AmountProps) => {
    const { badge } = PLAYFUL;

    return (
        <>
            <Abs
                x={badge.cx - 13}
                y={badge.cy + badge.r - 5.5}
                w={26}
                h={8}
                style={{
                    background: light,
                    border: `${mm(0.45)} solid ${ink}`,
                    borderRadius: mm(4),
                    boxSizing: 'border-box',
                    transform: 'rotate(-4deg)',
                }}
            >
                <FitText
                    text={amount}
                    x={1.5}
                    y={0.6}
                    w={22.1}
                    h={5.9}
                    maxFontMm={5.4}
                    minFontMm={2.6}
                    font="heading"
                    family={SPARTAN}
                    weight={800}
                    color={ink}
                    align="center"
                    slot="value"
                />
            </Abs>
            <Abs
                x={badge.cx - 12}
                y={badge.cy - badge.r - 2}
                w={24}
                h={5}
                style={{
                    background: ink,
                    borderRadius: mm(2.5),
                    transform: 'rotate(3deg)',
                }}
            >
                <FitText
                    text={bank}
                    x={1.5}
                    y={0.5}
                    w={21}
                    h={4}
                    maxFontMm={2.6}
                    minFontMm={1.4}
                    font="heading"
                    family={SPARTAN}
                    weight={800}
                    color={readableOn(ink)}
                    align="center"
                    slot={bankSlot}
                    clip
                />
            </Abs>
        </>
    );
};

const PlayfulAmount = ({ amount, bank, bankSlot, ink }: AmountProps) => {
    const { badge } = PLAYFUL;

    return (
        <Abs
            x={badge.cx - badge.r}
            y={badge.cy - badge.r}
            w={2 * badge.r}
            h={2 * badge.r}
            style={{ transform: 'rotate(-6deg)' }}
        >
            <FitText
                text={amount}
                x={3.4}
                y={7.4}
                w={2 * badge.r - 6.8}
                h={11.5}
                maxFontMm={11}
                minFontMm={4}
                font="heading"
                family={SPARTAN}
                weight={800}
                letterSpacingEm={-0.02}
                color={ink}
                align="center"
                slot="value"
            />
            <FitText
                text={bank}
                x={6}
                y={19}
                w={2 * badge.r - 12}
                h={5.6}
                maxFontMm={2.8}
                minFontMm={1.4}
                wrap="words"
                lineHeight={1.05}
                font="heading"
                family={SPARTAN}
                weight={800}
                color={ink}
                align="center"
                slot={bankSlot}
                clip
            />
        </Abs>
    );
};

const PlayfulPill = ({
    title,
    noteName,
    hasEdition,
    pillColor,
}: {
    title: string;
    noteName: string;
    hasEdition: boolean;
    pillColor: string;
}) => {
    const { pill } = PLAYFUL;

    return (
        <Abs
            x={pill.x}
            y={pill.y}
            w={pill.w}
            h={pill.h}
            style={{
                background: pillColor,
                borderRadius: mm(pill.r),
                transform: 'rotate(3deg)',
            }}
            slot="strip"
        >
            <FitText
                text={title}
                x={3}
                y={hasEdition ? 3 : 3.5}
                w={pill.w - 6}
                h={hasEdition ? 14 : 19}
                maxFontMm={hasEdition ? 5.2 : 6}
                minFontMm={NOTE_NAME_BOX.minFontMm}
                wrap="words"
                lineHeight={NOTE_NAME_BOX.lineHeight}
                font="heading"
                family={SPARTAN}
                weight={800}
                color={readableOn(pillColor)}
                align="center"
                slot="edition-name"
                clip
            />
            {hasEdition && (
                <FitText
                    text={noteName}
                    x={3}
                    y={18.6}
                    w={pill.w - 6}
                    h={4}
                    maxFontMm={2.6}
                    minFontMm={1.5}
                    font="body"
                    weight={600}
                    color={readableOn(pillColor)}
                    align="center"
                    slot="play-money"
                />
            )}
        </Abs>
    );
};

export const PlayfulNoteFace = ({
    value,
    paper,
    bankName,
    editionName,
    photo,
}: StyledNoteProps) => {
    const { theme } = useRender();
    const { frame, radius } = PLAYFUL;
    const { money, bank, bankSlot, noteName, hasEdition, title } = useNoteWords(
        value,
        bankName,
        editionName,
    );
    const ink = inkOf(theme, paper);
    const light = notePaperLight(paper, theme.paper);
    const full = isFullPhoto(photo);
    const framed = photo !== undefined && !full;
    const colors = [theme.accent, theme.secondaryAccent, ink];
    // The pill of the edition is the strip of the theme's note: the accent in Riso, the ink elsewhere.
    const pillColor = theme.id === 'riso' ? theme.accent : ink;
    const amount = { amount: money(value), bank, bankSlot, ink, light };

    return (
        <>
            {full && (
                <FullPhoto
                    field={frame}
                    photo={photo}
                    light={light}
                    radius={radius}
                />
            )}
            <PlayfulArt
                value={value}
                paper={paper}
                ink={ink}
                light={light}
                accents={colors}
                full={full}
            />
            {framed && <PlayfulBadgePhoto photo={photo} />}
            <PlayfulValues value={value} ink={ink} />
            {framed ? (
                <PlayfulFramedAmount {...amount} />
            ) : (
                <PlayfulAmount {...amount} />
            )}
            <PlayfulPill
                title={title}
                noteName={noteName}
                hasEdition={hasEdition}
                pillColor={pillColor}
            />
        </>
    );
};
