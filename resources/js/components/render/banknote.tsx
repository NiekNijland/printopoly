import type { PhotoSource } from '@/lib/render/photo';
import { standardEdition } from '@/lib/render/standard-edition';
import { partStyleOf } from '@/lib/render/style';

import { NoteFace } from './banknote-face';
import { BANKNOTE_SIZE_MM } from './banknote-parts';
import { PlainNoteFace } from './banknote-plain';
import { StyledNoteFace } from './banknote-styles';
import { Sheet, type ElementProps } from './sheet';

export type BanknoteProps = {
    value: number;
    /** Paper colour of the note; defaults to the colour of this value in the game data. */
    color?: string;
    /** Name of the bank, the same on every note; "Speelgeld" without one. */
    bankName?: string;
    /** Name of the edition, on the dark strip at the end of the note; "Speelgeld" without one. */
    editionName?: string;
    photo?: PhotoSource;
} & ElementProps;

/** The standard colour of a note value, from the game data. */
export const noteColor = (value: number): string => {
    return (
        standardEdition.money.notes.find((note) => note.value === value)
            ?.color ?? '#FFFDF7'
    );
};

/** A banknote of play money. It always shows the word "speelgeld" or "play money" (B85). */
export const Banknote = ({
    value,
    color,
    bankName,
    editionName,
    photo,
    ...element
}: BanknoteProps) => {
    const paper = color ?? noteColor(value);
    // A style of its own (B270) draws the note on the colour of its value in every theme.
    const own = partStyleOf(element.style, 'money');
    // Strak prints flat and typographic: white paper with the colour of the value as one block (Tom, B255).
    const plain = own === undefined && element.theme === 'strak';

    return (
        <Sheet
            {...element}
            element="banknote"
            widthMm={BANKNOTE_SIZE_MM.w}
            heightMm={BANKNOTE_SIZE_MM.h}
            background={plain ? '#FFFFFF' : paper}
        >
            {own !== undefined ? (
                <StyledNoteFace
                    style={own}
                    value={value}
                    paper={paper}
                    bankName={bankName}
                    editionName={editionName}
                    photo={photo}
                />
            ) : plain ? (
                <PlainNoteFace
                    value={value}
                    color={paper}
                    bankName={bankName}
                    editionName={editionName}
                    photo={photo}
                />
            ) : (
                <NoteFace
                    value={value}
                    paper={paper}
                    bankName={bankName}
                    editionName={editionName}
                    photo={photo}
                />
            )}
        </Sheet>
    );
};
