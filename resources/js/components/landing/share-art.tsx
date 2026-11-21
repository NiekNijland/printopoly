import { SpacePiece } from '@/components/table/pieces';
import { Stage, TableItem } from '@/components/table/stage';

interface ShareArtProps {
    edition: string;
    question: string;
    answer: string;
    name: string;
    send: string;
}

/**
 * The page friends open from the link of "Maak het samen" (B128), drawn small: the edition's name, one
 * question, an answer, and a button. Next to it lies the space that the answer will become.
 */
export function ShareArt({
    edition,
    question,
    answer,
    name,
    send,
}: ShareArtProps) {
    return (
        <div className="overflow-hidden rounded-control border-2 border-ink bg-paper">
            <Stage width={360} height={230}>
                <TableItem left={28} top={14} rotate={-3}>
                    <div className="flex h-[200px] w-[186px] flex-col overflow-hidden rounded-control border-2 border-ink bg-card shadow-paper">
                        <div className="border-b-2 border-ink bg-board px-3 py-2 font-display text-base leading-tight font-extrabold">
                            {edition}
                        </div>
                        <div className="flex flex-1 flex-col gap-2 p-3 text-xs">
                            <span className="font-semibold">{question}</span>
                            <span className="rounded-control border-2 border-ink px-2 py-1.5">
                                {answer}
                            </span>
                            <span className="rounded-control border-2 border-ink px-2 py-1.5 text-ink-soft">
                                {name}
                            </span>
                            <span className="mt-auto rounded-control bg-press px-2 py-2 text-center text-sm font-semibold text-white">
                                {send}
                            </span>
                        </div>
                    </div>
                </TableItem>
                <TableItem left={236} top={40} rotate={5} z={2}>
                    <SpacePiece
                        position={1}
                        width={96}
                        className="shadow-sheet"
                    />
                </TableItem>
            </Stage>
        </div>
    );
}
