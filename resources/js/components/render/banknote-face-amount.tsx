import { mm } from '@/lib/render/units';

import { NOTE_LAYOUT } from './banknote-face-guilloche';
import { FitText } from './fit-text';
import { Abs } from './sheet';

type Inks = { ink: string; light: string };

type AmountProps = Inks & {
    amount: string;
    bank: string;
    bankSlot: string;
};

export const NoteFramedAmount = ({
    ink,
    light,
    amount,
    bank,
    bankSlot,
}: AmountProps) => {
    const { oval } = NOTE_LAYOUT;

    return (
        <>
            <Abs
                x={oval.cx - 15}
                y={oval.cy + oval.ry - 7}
                w={30}
                h={9}
                style={{
                    background: light,
                    border: `0.35mm solid ${ink}`,
                    borderRadius: mm(4.5),
                    boxSizing: 'border-box',
                }}
            />
            <FitText
                text={amount}
                x={oval.cx - 13}
                y={oval.cy + oval.ry - 6.2}
                w={26}
                h={7.4}
                maxFontMm={6.5}
                minFontMm={3}
                font="heading"
                color={ink}
                align="center"
                slot="value"
            />
            <FitText
                text={bank}
                x={oval.cx - oval.rx}
                y={oval.cy + oval.ry + 2.2}
                w={2 * oval.rx}
                h={4.6}
                maxFontMm={3.2}
                minFontMm={1.6}
                wrap="words"
                lineHeight={1.05}
                font="heading"
                color={ink}
                align="center"
                slot={bankSlot}
                clip
            />
        </>
    );
};

export const NoteAmount = ({ ink, amount, bank, bankSlot }: AmountProps) => {
    const { oval } = NOTE_LAYOUT;

    return (
        <>
            <FitText
                text={amount}
                x={oval.cx - oval.rx + 4}
                y={oval.cy - 12.5}
                w={2 * oval.rx - 8}
                h={17}
                maxFontMm={16}
                minFontMm={5}
                font="heading"
                color={ink}
                align="center"
                slot="value"
            />
            <FitText
                text={bank}
                x={oval.cx - oval.rx + 8}
                y={oval.cy + 5}
                w={2 * oval.rx - 16}
                h={5.5}
                maxFontMm={3.6}
                minFontMm={1.6}
                wrap="words"
                lineHeight={1.05}
                font="heading"
                color={ink}
                align="center"
                slot={bankSlot}
                clip
            />
        </>
    );
};
