import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';

import { RegistrationMark } from '@/components/logo';
import { BoxLid } from '@/components/render';
import { sampleEdition } from '@/data/sample-edition';
import { resolveEdition } from '@/lib/edition/resolve';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';

import {
    BankCard,
    BoardPiece,
    CardFan,
    CardPiece,
    CropMarks,
    Die,
    NotePiece,
    NoteSheet,
    PanelStack,
    Pawn,
    Ruler,
    Scissors,
    SpacePiece,
    TextSheet,
} from './pieces';
import { Scaled } from './scaled';
import { Stage, TableItem } from './stage';

export type PageArtName =
    'printgids' | 'faq' | 'privacy' | 'terms' | 'contact' | 'edition';

/** The big drawing in the colour band at the top of a public page (B109). */
export function PageArt({ name }: { name: PageArtName }) {
    return (
        <Stage width={400} height={250}>
            {name === 'printgids' && (
                <>
                    <TableItem left={10} top={36} rotate={-4}>
                        <PanelStack size={118} />
                    </TableItem>
                    <TableItem left={170} top={20} rotate={5}>
                        <CardFan width={190} />
                    </TableItem>
                    <TableItem left={150} top={184} rotate={-3} z={3}>
                        <Ruler width={190} className="paper-shadow" />
                    </TableItem>
                    <TableItem left={300} top={168} rotate={-14} z={3}>
                        <Scissors size={90} className="paper-shadow" />
                    </TableItem>
                    <TableItem left={30} top={176} rotate={8} z={3}>
                        <BankCard width={100} className="paper-shadow" />
                    </TableItem>
                </>
            )}
            {name === 'faq' && (
                <>
                    <TableItem left={20} top={30} rotate={-6}>
                        <CardPiece
                            kind="chance"
                            width={120}
                            className="shadow-sheet"
                        />
                    </TableItem>
                    <TableItem left={150} top={14} rotate={5}>
                        <CardPiece
                            kind="chest"
                            width={120}
                            className="shadow-sheet"
                        />
                    </TableItem>
                    <TableItem left={262} top={92} rotate={-8} z={3}>
                        <span className="text-8xl flex size-28 items-center justify-center bg-card font-display font-extrabold text-press shadow-sheet">
                            ?
                        </span>
                    </TableItem>
                    <TableItem left={110} top={190} rotate={10} z={3}>
                        <Die size={44} className="paper-shadow" />
                    </TableItem>
                </>
            )}
            {name === 'privacy' && (
                <>
                    <TableItem left={40} top={30} rotate={-7}>
                        <TextSheet width={150} />
                    </TableItem>
                    <TableItem left={170} top={20} rotate={4} z={2}>
                        <TextSheet width={150} lines={7} />
                    </TableItem>
                    <TableItem left={300} top={150} rotate={0} z={3}>
                        <span className="flex size-20 items-center justify-center rounded-full bg-paper shadow-sheet">
                            <RegistrationMark size={48} />
                        </span>
                    </TableItem>
                </>
            )}
            {name === 'terms' && (
                <>
                    <TableItem left={30} top={26} rotate={5}>
                        <TextSheet width={156} lines={10} />
                    </TableItem>
                    <TableItem left={210} top={34} rotate={-5} z={2}>
                        <CardPiece
                            kind="deed"
                            width={116}
                            className="shadow-sheet"
                        />
                    </TableItem>
                    <TableItem left={286} top={176} rotate={-12} z={3}>
                        <Scissors size={90} className="paper-shadow" />
                    </TableItem>
                </>
            )}
            {name === 'edition' && (
                <>
                    <TableItem left={20} top={26} rotate={-5}>
                        <BoardPiece width={210} peel className="paper-shadow" />
                    </TableItem>
                    <TableItem left={262} top={14} rotate={8} z={2}>
                        <CardPiece
                            kind="chance"
                            width={80}
                            className="shadow-sheet"
                        />
                    </TableItem>
                    <TableItem left={270} top={130} rotate={-5} z={2}>
                        <CardPiece
                            kind="deed"
                            width={80}
                            className="shadow-sheet"
                        />
                    </TableItem>
                    <TableItem left={30} top={206} rotate={6} z={3}>
                        <Pawn
                            color="#C8321F"
                            size={40}
                            className="paper-shadow"
                        />
                    </TableItem>
                </>
            )}
            {name === 'contact' && (
                <>
                    <TableItem left={30} top={40} rotate={-5}>
                        <Envelope />
                    </TableItem>
                    <TableItem left={240} top={30} rotate={7} z={2}>
                        <CardPiece
                            kind="chance"
                            width={100}
                            className="shadow-sheet"
                        />
                    </TableItem>
                    <TableItem left={250} top={176} rotate={-4} z={3}>
                        <Pawn
                            color="#C8321F"
                            size={46}
                            className="paper-shadow"
                        />
                    </TableItem>
                </>
            )}
        </Stage>
    );
}

/** A paper envelope with a red stamp. */
function Envelope() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 200 130"
            width={200}
            height={130}
            className="paper-shadow"
        >
            <rect
                x="1"
                y="1"
                width="198"
                height="128"
                fill="#FFFDF7"
                stroke="#1B1F24"
                strokeWidth="2"
            />
            <path
                d="M1 1 L100 76 L199 1"
                fill="none"
                stroke="#1B1F24"
                strokeWidth="2"
            />
            <path
                d="M1 129 L80 62 M199 129 L120 62"
                fill="none"
                stroke="#1B1F24"
                strokeWidth="1"
                opacity="0.4"
            />
            <rect x="150" y="14" width="34" height="40" fill="#C8321F" />
            <rect
                x="155"
                y="19"
                width="24"
                height="30"
                fill="none"
                stroke="#FFFDF7"
                strokeWidth="1.5"
                strokeDasharray="3 2"
            />
        </svg>
    );
}

export type SectionArtName =
    | 'proof'
    | 'board'
    | 'cards'
    | 'money'
    | 'pawns'
    | 'lid'
    | 'share'
    | 'trouble';

/** A small still life per part of the print guide, lying on a coloured tile. */
export function SectionArt({ name }: { name: SectionArtName }) {
    return (
        <Stage width={360} height={170}>
            {name === 'proof' && (
                <>
                    <TableItem left={26} top={24} rotate={-3}>
                        <CropMarks inset={8} className="bg-card shadow-sheet">
                            <div className="flex items-end gap-2">
                                <SpacePiece position={1} width={46} />
                                <SpacePiece position={0} width={64} />
                            </div>
                        </CropMarks>
                    </TableItem>
                    <TableItem left={192} top={20} rotate={7} z={2}>
                        <BankCard width={120} className="paper-shadow" />
                    </TableItem>
                    <TableItem left={170} top={118} rotate={-2} z={2}>
                        <Ruler width={170} className="paper-shadow" />
                    </TableItem>
                </>
            )}
            {name === 'board' && (
                <>
                    <TableItem left={26} top={20} rotate={-5}>
                        <BoardPiece width={128} peel className="paper-shadow" />
                    </TableItem>
                    <TableItem left={196} top={14} rotate={4}>
                        <PanelStack size={104} />
                    </TableItem>
                </>
            )}
            {name === 'cards' && (
                <TableItem left={90} top={10} rotate={0}>
                    <CardFan width={190} />
                </TableItem>
            )}
            {name === 'money' && (
                <>
                    <TableItem left={22} top={14} rotate={-4}>
                        <NoteSheet width={140} />
                    </TableItem>
                    <TableItem left={196} top={34} rotate={5}>
                        <NotePiece
                            value={100}
                            width={130}
                            className="shadow-sheet"
                        />
                    </TableItem>
                    <TableItem left={216} top={92} rotate={-6} z={2}>
                        <NotePiece
                            value={20}
                            width={130}
                            className="shadow-sheet"
                        />
                    </TableItem>
                </>
            )}
            {name === 'pawns' && (
                <>
                    <TableItem left={70} top={40} rotate={-6}>
                        <Pawn
                            color="#C8321F"
                            size={66}
                            className="paper-shadow"
                        />
                    </TableItem>
                    <TableItem left={150} top={30} rotate={4}>
                        <Pawn
                            color="#00A3E0"
                            size={66}
                            className="paper-shadow"
                        />
                    </TableItem>
                    <TableItem left={230} top={42} rotate={-3}>
                        <Pawn
                            color="#E6007E"
                            size={66}
                            className="paper-shadow"
                        />
                    </TableItem>
                </>
            )}
            {name === 'lid' && <LidArt />}
            {name === 'share' && (
                <>
                    <TableItem left={120} top={14} rotate={-4}>
                        <span className="block bg-card p-2 pb-6 shadow-sheet">
                            <BoardPiece width={120} />
                        </span>
                    </TableItem>
                </>
            )}
            {name === 'trouble' && (
                <>
                    <TableItem left={40} top={40} rotate={-6}>
                        <Scissors size={110} className="paper-shadow" />
                    </TableItem>
                    <TableItem left={170} top={26} rotate={6}>
                        <span className="text-5xl flex size-24 items-center justify-center bg-warning font-display font-extrabold shadow-sheet">
                            !
                        </span>
                    </TableItem>
                    <TableItem left={156} top={124} rotate={-2} z={2}>
                        <Ruler width={150} className="paper-shadow" />
                    </TableItem>
                </>
            )}
        </Stage>
    );
}

function LidArt() {
    const { locale } = usePage().props;
    const edition = useMemo(
        () => resolveEdition(sampleEdition(locale)),
        [locale],
    );
    const size = DEFAULT_BOARD_PROFILE.boxLid;

    return (
        <>
            <TableItem left={110} top={14} rotate={-4}>
                <Scaled
                    widthMm={size.w}
                    heightMm={size.h}
                    width={140}
                    className="shadow-sheet"
                >
                    <BoxLid
                        theme={edition.theme}
                        locale={edition.language}
                        currency={edition.currency.id}
                        editionName={edition.name}
                    />
                </Scaled>
            </TableItem>
        </>
    );
}
