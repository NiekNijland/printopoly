import { DEFAULT_BOARD_PROFILE, type BoardProfile } from '@/lib/print/board';
import { INVITATION } from '@/lib/print/extras';
import type { PhotoSource } from '@/lib/render/photo';
import { THEMES } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { Board, type BoardProps } from './board';
import { FitText } from './fit-text';
import { InkBar } from './ink-bar';
import { PhotoSlot } from './photo-slot';
import { brandColor } from './rules-booklet';
import { Abs, Frame, Sheet, useRender, type ElementProps } from './sheet';

export interface InvitationProps extends ElementProps {
    /** What the evening is about: date, place, what to bring. One line per row. */
    text: string;
    editionName: string;
    profile?: BoardProfile;
    /**
     * The real board of the edition (`boardPropsOf`, bug 5 of ronde 3): names, colours, words, photos and its own
     * centre. Without it the little board is the standard one with the edition name.
     */
    board?: BoardProps;
    /** The headline; "Je bent uitgenodigd" when absent (B169). */
    headline?: string;
    /** The small line above the headline; "Spelavond" when absent, none when empty (B169). */
    kicker?: string;
    photo?: PhotoSource;
}

/** What the card says until its owner writes something: lines to fill in by hand. */
export function defaultInvitationText(locale: 'nl' | 'en'): string {
    return locale === 'nl'
        ? 'Wanneer: …………………………\nWaar: …………………………\nNeem mee: …………………………'
        : 'When: …………………………\nWhere: …………………………\nBring: …………………………';
}

export const INVITATION_HEAD = {
    nl: 'Je bent uitgenodigd',
    en: 'You are invited',
} as const;
export const INVITATION_KICKER = {
    nl: 'Spelavond',
    en: 'Game night',
} as const;

function Card({
    text,
    editionName,
    profile,
    board: boardProps,
    headline,
    kicker,
    photo,
}: Pick<
    InvitationProps,
    | 'text'
    | 'editionName'
    | 'profile'
    | 'board'
    | 'headline'
    | 'kicker'
    | 'photo'
>) {
    const { theme, locale, currency, words, style } = useRender();
    const { w, h } = INVITATION;
    const hasPhoto = photo !== undefined;
    const board = hasPhoto ? 50 : 68;
    const boardProfile =
        boardProps?.profile ?? profile ?? DEFAULT_BOARD_PROFILE;
    const scale = board / boardProfile.outer;
    const head =
        headline === undefined || headline.trim() === ''
            ? INVITATION_HEAD[locale]
            : headline;
    const small = kicker ?? INVITATION_KICKER[locale];

    const top = hasPhoto ? 38 : 10;
    const body = text.trim() === '' ? defaultInvitationText(locale) : text;
    const boardTop = top + (hasPhoto ? 22 : 29);

    return (
        <>
            <Frame
                ornate
                x={4}
                y={4}
                w={w - 8}
                h={h - 8}
                color={theme.ink}
                strokeMm={theme.frameMm + 0.2}
                radiusMm={Math.max(0, theme.cardRadiusMm - 1)}
            />
            {hasPhoto && (
                <PhotoSlot x={9} y={9} w={w - 18} h={26} photo={photo} />
            )}
            {small.trim() !== '' && (
                <Abs
                    x={9}
                    y={top - (hasPhoto ? 1 : 0)}
                    w={w - 18}
                    h={4}
                    slot="invitation-kicker"
                >
                    <span
                        style={{
                            display: 'block',
                            textAlign: 'center',
                            fontFamily: theme.monoFont,
                            fontSize: mm(2.5),
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            color: brandColor(theme),
                        }}
                    >
                        {small}
                    </span>
                </Abs>
            )}
            <FitText
                text={head}
                x={9}
                y={top + 3.5}
                w={w - 18}
                h={11}
                maxFontMm={9.5}
                minFontMm={5}
                font="heading"
                align="center"
                color={theme.ink}
                slot="invitation-title"
            />
            <FitText
                text={editionName}
                x={9}
                y={top + 15}
                w={w - 18}
                h={6}
                // A script name (Gala) needs more room for its small letters (B247).
                maxFontMm={theme.titleScale > 1 ? 7 : 5}
                minFontMm={3}
                font={theme.titleScale > 1 ? 'title' : 'body'}
                weight={theme.titleScale > 1 ? undefined : 600}
                align="center"
                color={brandColor(theme)}
                slot="invitation-edition"
            />
            <div
                style={{
                    position: 'absolute',
                    left: mm((w - board) / 2),
                    top: mm(boardTop),
                    width: mm(board),
                    height: mm(board),
                    transform: 'rotate(-3deg)',
                    boxShadow: `0 0 0 ${mm(0.4)} ${theme.ink}`,
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: mm(boardProfile.outer),
                        height: mm(boardProfile.outer),
                        transform: `scale(${String(scale)})`,
                        transformOrigin: 'top left',
                    }}
                >
                    <Board
                        theme={theme.id}
                        locale={locale}
                        currency={currency}
                        words={words}
                        {...(style === undefined ? {} : { style })}
                        editionName={editionName}
                        {...boardProps}
                        profile={boardProfile}
                        bleedMm={0}
                    />
                </div>
            </div>
            <FitText
                text={body}
                x={10}
                y={boardTop + board + 6}
                w={w - 20}
                h={h - (boardTop + board + 6) - 14}
                maxFontMm={4.6}
                minFontMm={2.6}
                wrap="words"
                font="body"
                align="center"
                valign="middle"
                lineHeight={1.4}
                slot="invitation-text"
            />
            <InkBar x={w / 2 - 12} y={h - 10} w={24} h={1.4} theme={theme} />
        </>
    );
}

/** The invitation card (B123): A6, the little board, a line of text, and a photo when there is one. */
export function Invitation({
    text,
    editionName,
    profile,
    board,
    headline,
    kicker,
    photo,
    ...element
}: InvitationProps) {
    return (
        <Sheet
            {...element}
            element="invitation"
            widthMm={INVITATION.w}
            heightMm={INVITATION.h}
            background={THEMES[element.theme].paper}
        >
            <Card
                text={text}
                editionName={editionName}
                profile={profile}
                board={board}
                headline={headline}
                kicker={kicker}
                photo={photo}
            />
        </Sheet>
    );
}
