import {
    BoardPiece,
    CardPiece,
    NotePiece,
    SpacePiece,
} from '@/components/render/table-pieces';
import { CropMarks, PanelStack } from '@/components/render/table-sheets';
import { Stage, TableItem } from '@/components/render/table-stage';
import { Ruler, Scissors } from '@/components/render/table-tools';

const DesignPieces = () => (
    <>
        <TableItem left={22} top={26} rotate={-4}>
            <BoardPiece width={104} className="paper-shadow" />
        </TableItem>
        <TableItem left={140} top={14} rotate={7}>
            <CardPiece kind="chance" width={56} className="shadow-sheet" />
        </TableItem>
        <TableItem left={190} top={30} rotate={-5}>
            <CardPiece kind="deed" width={56} className="shadow-sheet" />
        </TableItem>
        <TableItem left={134} top={112} rotate={3}>
            <NotePiece value={20} width={100} className="shadow-sheet" />
        </TableItem>
    </>
);

const SpacePieces = () => (
    <>
        <TableItem left={20} top={26} rotate={-5}>
            <SpacePiece position={1} width={72} className="shadow-sheet" />
        </TableItem>
        <TableItem left={104} top={20} rotate={4}>
            <SpacePiece position={3} width={72} className="shadow-sheet" />
        </TableItem>
        <TableItem left={188} top={34} rotate={-3}>
            <SpacePiece position={6} width={72} className="shadow-sheet" />
        </TableItem>
    </>
);

const WarningPieces = () => (
    <>
        <TableItem left={40} top={20} rotate={-4}>
            <SpacePiece position={9} width={104} className="shadow-sheet" />
        </TableItem>
        <TableItem left={146} top={44} rotate={6} z={2}>
            <span className="text-5xl flex size-24 items-center justify-center bg-warning font-display font-extrabold shadow-sheet">
                !
            </span>
        </TableItem>
    </>
);

const PrintPieces = () => (
    <>
        <TableItem left={18} top={20} rotate={-3}>
            <PanelStack size={78} />
        </TableItem>
        <TableItem left={122} top={34} rotate={5}>
            <CropMarks inset={8} className="bg-card shadow-sheet">
                <NotePiece value={100} width={80} />
            </CropMarks>
        </TableItem>
        <TableItem left={170} top={104} rotate={-8} z={2}>
            <Scissors size={84} />
        </TableItem>
        <TableItem left={40} top={130} rotate={2} z={2}>
            <Ruler width={100} />
        </TableItem>
    </>
);

/** A small drawing of the printed thing behind each step of "Zo maak je een editie" (B109). */
export const StepArt = ({ step }: { step: 1 | 2 | 3 | 4 }) => {
    return (
        <div className="overflow-hidden rounded-control border-2 border-ink bg-paper">
            <Stage width={280} height={170}>
                {step === 1 && <DesignPieces />}
                {step === 2 && <SpacePieces />}
                {step === 3 && <WarningPieces />}
                {step === 4 && <PrintPieces />}
            </Stage>
        </div>
    );
};
