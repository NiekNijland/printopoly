import { usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Board, GameCard, TitleDeed } from '@/components/render';
import { sampleEdition } from '@/data/sample-edition';
import { resolveEdition } from '@/lib/edition/resolve';
import { standardEdition } from '@/lib/game/standard-edition';
import { mm } from '@/lib/render/units';

/**
 * The board of the sample edition with a fan of cards, drawn by the real renderers
 * (docs/design/Main.dc.html). The renderers work in mm at true size, so the board is
 * scaled down with a CSS transform to the width of its box. Server rendering uses the
 * desktop width; the browser measures the box after hydration. The cards are hidden on
 * phones (Mobiel-landing.dc.html).
 */

const PX_PER_MM = 96 / 25.4;
const DEFAULT_WIDTH_PX = 480;
/** The fan cards are drawn larger than true size next to the board, as in the design. */
const FAN_CARD_FACTOR = 1.5;

const CROP_MARKS = [
    'top-0 left-0 border-r border-b',
    'top-0 right-0 border-b border-l',
    'bottom-0 left-0 border-t border-r',
    'right-0 bottom-0 border-t border-l',
];

export function BoardIllustration() {
    const { locale } = usePage().props;
    const edition = useMemo(
        () => resolveEdition(sampleEdition(locale)),
        [locale],
    );
    const boardMm = edition.boardProfile.outer;
    const boardPx = boardMm * PX_PER_MM;
    const [width, setWidth] = useState(DEFAULT_WIDTH_PX);
    const box = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = box.current;

        if (element === null) {
            return;
        }

        const update = () => setWidth(element.clientWidth);

        update();

        const observer = new ResizeObserver(update);

        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    const scale = width / boardPx;
    const spaces = Object.fromEntries(
        edition.spaces
            .filter((space) => space.customized)
            .map((space) => [space.position, { name: space.name }]),
    );
    const chance = edition.decks?.chance[0];
    const chest = edition.decks?.chest[0];
    const deed = edition.deeds?.[0];
    const common = {
        theme: edition.theme,
        locale: edition.language,
        currency: edition.currency.id,
    } as const;

    return (
        <div className="relative p-6 md:pb-12">
            {CROP_MARKS.map((classes) => (
                <div
                    key={classes}
                    aria-hidden="true"
                    className={`absolute size-4 border-ink ${classes}`}
                />
            ))}

            <div
                ref={box}
                className="relative aspect-square w-[min(480px,calc(100vw-112px))]"
            >
                <div
                    aria-hidden="true"
                    className="absolute inset-0 overflow-hidden"
                >
                    <div
                        className="absolute top-0 left-0 origin-top-left"
                        style={{ transform: `scale(${scale})` }}
                    >
                        <Board
                            {...common}
                            editionName={edition.name}
                            profile={edition.boardProfile}
                            spaces={spaces}
                        />
                    </div>
                </div>

                <div
                    aria-hidden="true"
                    className="absolute -right-[8%] -bottom-[10%] hidden md:block"
                >
                    <div
                        className="relative origin-bottom-right"
                        style={{
                            width: mm(63 * 2.1),
                            height: mm(88),
                            transform: `scale(${scale * FAN_CARD_FACTOR})`,
                        }}
                    >
                        <FanCard className="top-0 left-0 -rotate-8">
                            {chance !== undefined && (
                                <GameCard
                                    {...common}
                                    deck="chance"
                                    side="front"
                                    card={standardEdition.decks.chance[0]}
                                    text={chance.text}
                                />
                            )}
                        </FanCard>
                        <FanCard className="top-0 left-[29mm]">
                            {chest !== undefined && (
                                <GameCard
                                    {...common}
                                    deck="chest"
                                    side="front"
                                    card={standardEdition.decks.chest[0]}
                                    text={chest.text}
                                />
                            )}
                        </FanCard>
                        <FanCard className="top-0 left-[58mm] rotate-8">
                            {deed !== undefined && (
                                <TitleDeed
                                    {...common}
                                    space={deed.space}
                                    side="front"
                                    name={deed.name}
                                />
                            )}
                        </FanCard>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FanCard({
    className,
    children,
}: {
    className: string;
    children: React.ReactNode;
}) {
    return (
        <div className={`absolute shadow-print ${className}`}>{children}</div>
    );
}
