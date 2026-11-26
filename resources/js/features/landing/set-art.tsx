import {
    CardFan,
    CropMarks,
    NoteSheet,
    PanelStack,
    SpacePiece,
} from '@/components/render/table-pieces';
import { Stage, TableItem } from '@/components/render/table-stage';

/** The printed matter of a set (B109): what arrives from the print shop, or what comes out of your printer. */
export function SetArt({ set }: { set: 'shop' | 'home' }) {
    return (
        <div className="overflow-hidden rounded-control border-2 border-ink bg-paper">
            <Stage width={320} height={210}>
                {set === 'shop' ? (
                    <>
                        <TableItem left={22} top={34} rotate={-3}>
                            <PanelStack size={104} />
                        </TableItem>
                        <TableItem left={156} top={34} rotate={3}>
                            <CardFan width={150} />
                        </TableItem>
                    </>
                ) : (
                    <>
                        <TableItem left={18} top={26} rotate={-3}>
                            <CropMarks
                                inset={8}
                                className="bg-card shadow-sheet"
                            >
                                <div className="grid grid-cols-3 gap-1.5">
                                    {[1, 3, 6, 9, 11, 14].map((position) => (
                                        <SpacePiece
                                            key={position}
                                            position={position}
                                            width={46}
                                        />
                                    ))}
                                </div>
                            </CropMarks>
                        </TableItem>
                        <TableItem left={198} top={30} rotate={4}>
                            <NoteSheet width={110} />
                        </TableItem>
                    </>
                )}
            </Stage>
        </div>
    );
}
