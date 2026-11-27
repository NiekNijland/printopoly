import { BoardSpace, spaceSize } from '@/components/render/board-space';
import { spaceKey } from '@/lib/render/edition-keys';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import { renderWords } from '@/lib/render/edition-words';
import type { PhotoSource } from '@/lib/render/photo';
import {
    BANK_CARD_CORNER_RADIUS,
    rulerTicks,
} from '@/lib/render/print-calibration';
import type { PageItem } from '@/lib/render/print-composition';
import { spaceAt } from '@/lib/render/standard-edition';
import { buildStyle } from '@/lib/render/style';
import { mm } from '@/lib/render/units';

const INK = '#1b1f24';
const FONT = "'Instrument Sans', sans-serif";

const Label = ({ text }: { text: string }) => {
    return (
        <div
            style={{
                position: 'absolute',
                left: 0,
                top: '100%',
                marginTop: mm(1.5),
                fontFamily: FONT,
                fontSize: mm(3.2),
                color: INK,
                whiteSpace: 'nowrap',
            }}
        >
            {text}
        </div>
    );
};

const RulerArt = ({ width, label }: { width: number; label: string }) => (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: mm(width),
                height: '0',
                borderTop: `${mm(0.25)} solid ${INK}`,
            }}
        />
        {rulerTicks().map((tick) => (
            <div
                key={tick.at}
                style={{
                    position: 'absolute',
                    left: mm(tick.at - 0.1),
                    top: 0,
                    width: mm(0.2),
                    height: mm(tick.length),
                    background: INK,
                }}
            />
        ))}
        {Array.from({ length: 11 }, (_, i) => (
            <div
                key={i}
                style={{
                    position: 'absolute',
                    left: mm(i * 10 - 5),
                    top: mm(6.5),
                    width: mm(10),
                    textAlign: 'center',
                    fontFamily: FONT,
                    fontSize: mm(2.6),
                    color: INK,
                }}
            >
                {i * 10}
            </div>
        ))}
        <div
            style={{
                position: 'absolute',
                left: 0,
                top: mm(11),
                fontFamily: FONT,
                fontSize: mm(3.2),
                color: INK,
            }}
        >
            {label}
        </div>
    </div>
);

/**
 * The test sheet (B74): a ruler of 100 mm, the outline of a bank card (85,60 × 53,98 mm), and one corner
 * space and one normal space of the board at true size, drawn by the real space renderer.
 */
export const CalibrationArt = ({
    item,
    resolved,
    label,
    photo,
}: {
    item: PageItem;
    resolved: ResolvedEdition;
    label: string;
    /** The crop of a space's photo, so the test sheet shows colour and sharpness too (B253). */
    photo?: (key: string) => PhotoSource | undefined;
}) => {
    const { trim } = item;

    if (item.id === 'ruler') {
        return <RulerArt width={trim.w} label={label} />;
    }

    if (item.id === 'bank-card') {
        return (
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box',
                    border: `${mm(0.3)} solid ${INK}`,
                    borderRadius: mm(BANK_CARD_CORNER_RADIUS),
                }}
            >
                <Label text={label} />
            </div>
        );
    }

    const position = item.id === 'corner-space' ? 0 : 1;
    const own = resolved.spaces[position];
    const space = own?.base ?? spaceAt(position);
    const size = spaceSize(space, resolved.boardProfile);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div
                style={{
                    width: mm(size.w),
                    height: mm(size.h),
                }}
            >
                <BoardSpace
                    theme={resolved.theme}
                    locale={resolved.language}
                    currency={resolved.currency.id}
                    words={renderWords(resolved.words)}
                    // The style of the board (B268), like the corner on the board itself.
                    style={buildStyle(resolved)}
                    space={space}
                    // The edition's own name and corner line, as the server sends them for the test sheet (R5-26).
                    name={own?.name}
                    text={own?.text}
                    photo={photo?.(spaceKey(position))}
                    profile={resolved.boardProfile}
                />
            </div>
            <Label text={label} />
        </div>
    );
};
