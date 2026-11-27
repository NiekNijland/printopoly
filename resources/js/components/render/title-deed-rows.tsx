import type { CSSProperties } from 'react';

import type { DeedStyle } from '@/lib/render/edition-part-styles';
import type { Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { deedLookOf, styledRowStyle } from './title-deed-styles';

/** One line of the table: the label on the left, the amount on the right. */
export const Row = ({
    label,
    value,
    height,
    font,
    look,
}: {
    label: string;
    value: string;
    height: number;
    font: number;
    /** The look of the row in a deed style (B269): stripes, a dotted leader, heavier amounts. */
    look?: RowLook;
}) => {
    const leader = look?.leader ?? null;

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: mm(leader === null ? 2 : 1),
                height: mm(height),
                fontSize: mm(font),
                whiteSpace: 'nowrap',
                boxSizing: 'border-box',
                ...look?.row,
            }}
            data-row=""
        >
            <span>{label}</span>
            {leader !== null && <span style={leader} aria-hidden="true" />}
            <span
                style={{ fontVariantNumeric: 'tabular-nums', ...look?.amount }}
            >
                {value}
            </span>
        </div>
    );
};

type RowLook = {
    row: CSSProperties;
    leader: CSSProperties | null;
    amount: CSSProperties;
};

/** The look of row `index` in a deed style, or none in the theme's own look. */
export const rowLook = (
    deedStyle: DeedStyle | undefined,
    index: number,
    band: string,
    street: boolean,
    theme: Theme,
): RowLook | undefined => {
    if (deedStyle === undefined) {
        return undefined;
    }

    return {
        ...styledRowStyle(deedStyle, index, band, street, theme),
        amount: deedLookOf(deedStyle).amount,
    };
};
