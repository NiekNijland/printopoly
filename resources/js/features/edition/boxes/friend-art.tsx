import { Board, type SpaceOverride } from '@/components/render';
import { Die, Pawn } from '@/components/render/table-pieces';
import { Scaled } from '@/components/render/table-scaled';
import { Stage, TableItem } from '@/components/render/table-stage';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import { renderWords } from '@/lib/render/edition-words';
import { buildStyle } from '@/lib/render/style';

/**
 * The top of the friends' page (B128): the edition's own board lying on the table, with a printed photo next to it
 * (what a friend can send), a pawn and a die. Decoration only.
 */
export const FriendArt = ({ resolved }: { resolved: ResolvedEdition }) => {
    const spaces: Record<number, SpaceOverride> = {};
    for (const space of resolved.spaces) {
        spaces[space.position] = {
            space: space.base,
            name: space.name,
            ...(space.town === undefined ? {} : { town: space.town }),
        };
    }
    const outer = resolved.boardProfile.outer;

    return (
        <Stage width={440} height={290}>
            <TableItem left={18} top={20} rotate={-4}>
                <Scaled
                    widthMm={outer}
                    heightMm={outer}
                    width={244}
                    className="shadow-sheet"
                >
                    <Board
                        theme={resolved.theme}
                        locale={resolved.language}
                        currency={resolved.currency.id}
                        words={renderWords(resolved.words)}
                        style={buildStyle(resolved)}
                        editionName={resolved.name}
                        profile={resolved.boardProfile}
                        spaces={spaces}
                    />
                </Scaled>
            </TableItem>
            <TableItem left={262} top={30} rotate={6} z={2} delay={0.08}>
                <PhotoPrint />
            </TableItem>
            <TableItem left={240} top={206} rotate={-6} z={3} delay={0.16}>
                <Pawn color="#C8321F" size={40} className="paper-shadow" />
            </TableItem>
            <TableItem left={300} top={222} rotate={9} z={3} delay={0.2}>
                <Die size={36} className="paper-shadow" />
            </TableItem>
        </Stage>
    );
};

/** A photo printed on paper with a white edge: what a friend sends for a space. */
const PhotoPrint = () => {
    return (
        <div className="w-[150px] bg-paper p-2 pb-7 shadow-sheet">
            <svg
                viewBox="0 0 134 110"
                width={134}
                height={110}
                aria-hidden="true"
                className="block"
            >
                <rect width="134" height="110" fill="#BDE3F2" />
                <circle cx="102" cy="28" r="13" fill="#F6D33C" />
                <path d="M0 78 Q34 50 70 72 T134 66 V110 H0 Z" fill="#7CB88F" />
                <path d="M0 92 Q46 74 92 90 T134 88 V110 H0 Z" fill="#4E9A6A" />
                <rect x="24" y="62" width="26" height="22" fill="#FFFDF7" />
                <path d="M21 63 L37 50 L53 63 Z" fill="#C8321F" />
                <rect x="33" y="72" width="7" height="12" fill="#1B1F24" />
            </svg>
        </div>
    );
};
