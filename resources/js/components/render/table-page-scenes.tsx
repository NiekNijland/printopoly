import { RegistrationMark } from '@/components/logo';

import { BoardPiece, CardFan, CardPiece, Die, Pawn } from './table-pieces';
import { PanelStack, TextSheet } from './table-sheets';
import { TableItem } from './table-stage';
import { BankCard, Ruler, Scissors } from './table-tools';

/** A paper envelope with a red stamp. */
const Envelope = () => {
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
};

export const PrintgidsScene = () => {
    return (
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
    );
};

export const FaqScene = () => {
    return (
        <>
            <TableItem left={20} top={30} rotate={-6}>
                <CardPiece kind="chance" width={120} className="shadow-sheet" />
            </TableItem>
            <TableItem left={150} top={14} rotate={5}>
                <CardPiece kind="chest" width={120} className="shadow-sheet" />
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
    );
};

export const PrivacyScene = () => {
    return (
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
    );
};

export const TermsScene = () => {
    return (
        <>
            <TableItem left={30} top={26} rotate={5}>
                <TextSheet width={156} lines={10} />
            </TableItem>
            <TableItem left={210} top={34} rotate={-5} z={2}>
                <CardPiece kind="deed" width={116} className="shadow-sheet" />
            </TableItem>
            <TableItem left={286} top={176} rotate={-12} z={3}>
                <Scissors size={90} className="paper-shadow" />
            </TableItem>
        </>
    );
};

export const EditionScene = () => {
    return (
        <>
            <TableItem left={20} top={26} rotate={-5}>
                <BoardPiece width={210} peel className="paper-shadow" />
            </TableItem>
            <TableItem left={262} top={14} rotate={8} z={2}>
                <CardPiece kind="chance" width={80} className="shadow-sheet" />
            </TableItem>
            <TableItem left={270} top={130} rotate={-5} z={2}>
                <CardPiece kind="deed" width={80} className="shadow-sheet" />
            </TableItem>
            <TableItem left={30} top={206} rotate={6} z={3}>
                <Pawn color="#C8321F" size={40} className="paper-shadow" />
            </TableItem>
        </>
    );
};

export const ContactScene = () => {
    return (
        <>
            <TableItem left={30} top={40} rotate={-5}>
                <Envelope />
            </TableItem>
            <TableItem left={240} top={30} rotate={7} z={2}>
                <CardPiece kind="chance" width={100} className="shadow-sheet" />
            </TableItem>
            <TableItem left={250} top={176} rotate={-4} z={3}>
                <Pawn color="#C8321F" size={46} className="paper-shadow" />
            </TableItem>
        </>
    );
};
