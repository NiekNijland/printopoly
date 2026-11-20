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
    /** The name of every space by position, so a renamed street reads renamed on the little board. */
    spaceNames?: Record<number, string>;
    /** The title options of the board centre (B125); the little board has no photos, so a photo mode shows the name. */
    centerTitle?: BoardProps['centerTitle'];
    photo?: PhotoSource;
}

/** What the card says until its owner writes something: lines to fill in by hand. */
export function defaultInvitationText(locale: 'nl' | 'en'): string {
    return locale === 'nl'
        ? 'Wanneer: …………………………\nWaar: …………………………\nNeem mee: …………………………'
        : 'When: …………………………\nWhere: …………………………\nBring: …………………………';
}

const HEAD = { nl: 'Je bent uitgenodigd', en: 'You are invited' } as const;
const KICKER = {
    nl: 'Spelavond',
    en: 'Game night',
} as const;

function Card({
    text,
    editionName,
    profile,
    spaceNames,
    centerTitle,
    photo,
}: Pick<
    InvitationProps,
    'text' | 'editionName' | 'profile' | 'spaceNames' | 'centerTitle' | 'photo'
>) {
    const { theme, locale } = useRender();
    const { w, h } = INVITATION;
    const hasPhoto = photo !== undefined;
    const board = hasPhoto ? 50 : 68;
    const boardProfile = profile ?? DEFAULT_BOARD_PROFILE;
    const scale = board / boardProfile.outer;
    const spaces: Record<number, { name: string }> = {};

    for (const [position, name] of Object.entries(spaceNames ?? {})) {
        spaces[Number(position)] = { name };
    }

    const top = hasPhoto ? 38 : 10;
    const body = text.trim() === '' ? defaultInvitationText(locale) : text;
    const boardTop = top + (hasPhoto ? 22 : 29);

    return (
        <>
            <Frame
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
            <Abs x={9} y={top - (hasPhoto ? 1 : 0)} w={w - 18} h={4}>
                <span
                    style={{
                        display: 'block',
                        textAlign: 'center',
                        fontFamily: theme.monoFont,
                        fontSize: mm(2.5),
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        color: brandColor(theme),
                    }}
                >
                    {KICKER[locale]}
                </span>
            </Abs>
            <FitText
                text={HEAD[locale]}
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
                maxFontMm={5}
                minFontMm={3}
                font="body"
                weight={600}
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
                        editionName={editionName}
                        profile={boardProfile}
                        spaces={spaces}
                        centerTitle={centerTitle}
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
    spaceNames,
    centerTitle,
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
                spaceNames={spaceNames}
                centerTitle={centerTitle}
                photo={photo}
            />
        </Sheet>
    );
}
