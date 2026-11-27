import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';

import { BoxLid } from '@/components/render/box-lid';
import { resolveEdition } from '@/lib/render/edition-resolve';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { sampleEdition } from '@/lib/render/sample-edition';

import {
    BoardPiece,
    CardFan,
    NotePiece,
    Pawn,
    SpacePiece,
} from './table-pieces';
import { Scaled } from './table-scaled';
import { CropMarks, NoteSheet, PanelStack } from './table-sheets';
import { TableItem } from './table-stage';
import { BankCard, Ruler, Scissors } from './table-tools';

export const ProofScene = () => {
    return (
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
    );
};

export const BoardScene = () => {
    return (
        <>
            <TableItem left={26} top={20} rotate={-5}>
                <BoardPiece width={128} peel className="paper-shadow" />
            </TableItem>
            <TableItem left={196} top={14} rotate={4}>
                <PanelStack size={104} />
            </TableItem>
        </>
    );
};

export const CardsScene = () => {
    return (
        <TableItem left={90} top={10} rotate={0}>
            <CardFan width={190} />
        </TableItem>
    );
};

export const MoneyScene = () => {
    return (
        <>
            <TableItem left={22} top={14} rotate={-4}>
                <NoteSheet width={140} />
            </TableItem>
            <TableItem left={196} top={34} rotate={5}>
                <NotePiece value={100} width={130} className="shadow-sheet" />
            </TableItem>
            <TableItem left={216} top={92} rotate={-6} z={2}>
                <NotePiece value={20} width={130} className="shadow-sheet" />
            </TableItem>
        </>
    );
};

export const PawnsScene = () => {
    return (
        <>
            <TableItem left={70} top={40} rotate={-6}>
                <Pawn color="#C8321F" size={66} className="paper-shadow" />
            </TableItem>
            <TableItem left={150} top={30} rotate={4}>
                <Pawn color="#00A3E0" size={66} className="paper-shadow" />
            </TableItem>
            <TableItem left={230} top={42} rotate={-3}>
                <Pawn color="#E6007E" size={66} className="paper-shadow" />
            </TableItem>
        </>
    );
};

export const ShareScene = () => {
    return (
        <>
            <TableItem left={120} top={14} rotate={-4}>
                <span className="block bg-card p-2 pb-6 shadow-sheet">
                    <BoardPiece width={120} />
                </span>
            </TableItem>
        </>
    );
};

export const TroubleScene = () => {
    return (
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
    );
};

export const LidArt = () => {
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
};
