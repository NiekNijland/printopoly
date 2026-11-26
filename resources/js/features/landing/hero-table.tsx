import {
    BoardPiece,
    CardPiece,
    NotePiece,
    Pawn,
} from '@/components/render/table-pieces';
import { Stage, TableItem } from '@/components/render/table-stage';

/**
 * The hero of the landing page (B97, B109): the sample board lying a little crooked on the
 * table, one corner of the sticker peeled back, with cards, a deed, notes and three pawns
 * around it; no dice, those come from your own box (B200). All drawn by the real renderers; the edition name runs along the diagonal.
 */
export function HeroTable() {
    return (
        <Stage width={560} height={520}>
            <TableItem left={22} top={34} rotate={-5} z={1} delay={0}>
                <BoardPiece width={390} peel className="paper-shadow" />
            </TableItem>

            <TableItem left={402} top={18} rotate={9} z={3} delay={0.15}>
                <CardPiece kind="chance" width={100} className="shadow-sheet" />
            </TableItem>
            <TableItem left={430} top={168} rotate={-7} z={3} delay={0.25}>
                <CardPiece kind="chest" width={100} className="shadow-sheet" />
            </TableItem>
            <TableItem left={400} top={318} rotate={5} z={3} delay={0.35}>
                <CardPiece kind="deed" width={100} className="shadow-sheet" />
            </TableItem>

            <TableItem left={30} top={430} rotate={4} z={2} delay={0.3}>
                <NotePiece value={50} width={150} className="shadow-sheet" />
            </TableItem>
            <TableItem left={150} top={444} rotate={-6} z={3} delay={0.4}>
                <NotePiece value={10} width={150} className="shadow-sheet" />
            </TableItem>

            <TableItem left={338} top={452} rotate={-8} z={4} delay={0.5}>
                <Pawn color="#E6007E" size={38} className="paper-shadow" />
            </TableItem>
            <TableItem left={500} top={430} rotate={-4} z={4} delay={0.45}>
                <Pawn color="#C8321F" size={44} className="paper-shadow" />
            </TableItem>
            <TableItem left={456} top={448} rotate={6} z={4} delay={0.55}>
                <Pawn color="#00A3E0" size={40} className="paper-shadow" />
            </TableItem>
        </Stage>
    );
}
