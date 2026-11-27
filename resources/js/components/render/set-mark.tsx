import type { Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

/** Height of the mark in mm: big enough to read across a table, small enough to stay out of the picture. */
const SET_MARK_HEIGHT = 3.4;

/**
 * The set mark (B242): a small tag "SET 2" on the back of every card and deed and on every banknote when more than
 * one set is made, so the sets of different tables do not get mixed up. It sits on the frame line of the card or the
 * note like a stamp, with its centre at (`cx`, `cy`) in mm of the element.
 */
export const SetMark = ({
    number,
    theme,
    cx,
    cy,
}: {
    number: number;
    theme: Theme;
    cx: number;
    cy: number;
}) => {
    return (
        <div
            data-set-mark={number}
            style={{
                position: 'absolute',
                left: mm(cx),
                top: mm(cy),
                transform: 'translate(-50%, -50%)',
                height: mm(SET_MARK_HEIGHT),
                padding: `0 ${mm(1.8)}`,
                display: 'flex',
                alignItems: 'center',
                gap: mm(0.9),
                background: theme.paper,
                border: `${mm(0.3)} solid ${theme.ink}`,
                borderRadius: mm(SET_MARK_HEIGHT / 2),
                color: theme.ink,
                fontFamily: theme.headingFont,
                fontWeight: theme.headingWeight,
                fontSize: mm(2.1),
                letterSpacing: '0.08em',
                lineHeight: 1,
                whiteSpace: 'nowrap',
            }}
        >
            <span>SET</span>
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: mm(2.6),
                    height: mm(2.6),
                    padding: `0 ${mm(0.5)}`,
                    borderRadius: mm(1.3),
                    background: theme.ink,
                    color: theme.paper,
                    letterSpacing: 0,
                }}
            >
                {number}
            </span>
        </div>
    );
};
