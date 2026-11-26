import { cutCornerBox } from '@/lib/render/banknote-guilloche';
import { PLAYFAIR } from '@/lib/render/themes';

import { NoteSvg } from './banknote-parts';
import { VINTAGE } from './banknote-styles-vintage-lines';
import { FitText } from './fit-text';

type Inks = { ink: string; light: string };

type AmountProps = Inks & {
    amount: string;
    bank: string;
    bankSlot: string;
};

export const VintageFramedAmount = ({
    ink,
    light,
    amount,
    bank,
    bankSlot,
}: AmountProps) => {
    const { oval } = VINTAGE;

    return (
        <>
            <NoteSvg slot="value-plate">
                <path
                    d={cutCornerBox(
                        {
                            x: oval.cx - 14,
                            y: oval.cy + oval.ry - 6.5,
                            w: 28,
                            h: 8.5,
                        },
                        1.6,
                    )}
                    fill={light}
                    stroke={ink}
                    strokeWidth={0.38}
                />
                <path
                    d={cutCornerBox(
                        {
                            x: oval.cx - 12,
                            y: oval.cy - oval.ry - 1.4,
                            w: 24,
                            h: 4.6,
                        },
                        1.1,
                    )}
                    fill={light}
                    stroke={ink}
                    strokeWidth={0.25}
                />
            </NoteSvg>
            <FitText
                text={amount}
                x={oval.cx - 12.5}
                y={oval.cy + oval.ry - 5.8}
                w={25}
                h={7.1}
                maxFontMm={6.4}
                minFontMm={3}
                font="heading"
                family={PLAYFAIR}
                weight={700}
                color={ink}
                align="center"
                slot="value"
            />
            <FitText
                text={bank}
                x={oval.cx - 11}
                y={oval.cy - oval.ry - 1.1}
                w={22}
                h={4}
                maxFontMm={2.4}
                minFontMm={1.4}
                font="heading"
                family={PLAYFAIR}
                weight={700}
                caps
                letterSpacingEm={0.06}
                color={ink}
                align="center"
                slot={bankSlot}
                clip
            />
        </>
    );
};

export const VintageAmount = ({ ink, amount, bank, bankSlot }: AmountProps) => {
    const { oval } = VINTAGE;

    return (
        <>
            <FitText
                text={amount}
                x={oval.cx - oval.rx + 4}
                y={oval.cy - 10.5}
                w={2 * oval.rx - 8}
                h={14}
                maxFontMm={14}
                minFontMm={5}
                font="heading"
                family={PLAYFAIR}
                weight={700}
                color={ink}
                align="center"
                slot="value"
            />
            <FitText
                text={bank}
                x={oval.cx - oval.rx + 7}
                y={oval.cy + 4.2}
                w={2 * oval.rx - 14}
                h={5.2}
                maxFontMm={2.8}
                minFontMm={1.4}
                wrap="words"
                lineHeight={1.05}
                font="heading"
                family={PLAYFAIR}
                weight={700}
                caps
                letterSpacingEm={0.06}
                color={ink}
                align="center"
                slot={bankSlot}
                clip
            />
        </>
    );
};
