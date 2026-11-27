import { useEffect, useMemo } from 'react';

import { RasterNotePattern } from '@/components/render/banknote-parts';
import { labelSpan, pageLabel, localizeLabel } from '@/features/print/labels';
import { resolveEdition } from '@/lib/render/edition-resolve';
import {
    composePages,
    type PageItem,
    type PageSpec,
    type PrintEdition,
    type PrintPart,
    type PrintSet,
} from '@/lib/render/print-composition';
import { allPartsOn, toEdition } from '@/lib/render/print-edition';
import { mm } from '@/lib/render/units';
import type { Segment } from '@/types/print';

import {
    ItemArt,
    photoOf,
    type ArtContext,
} from '../../components/render/print-item-art';
import { CalibrationArt } from './calibration-art';

export type PrintPayload = {
    part: PrintPart;
    set: PrintSet;
    /** Pages are this much shorter than the sheet so Chrome adds no blank page (B63). */
    pageShaveMm: number;
    /** Origin the page fetches built assets (fonts) from; see `print-assets` (B105). */
    assetBase?: string;
    edition: PrintEdition;
};

export const isPrintPayload = (payload: unknown): payload is PrintPayload =>
    typeof payload === 'object' &&
    payload !== null &&
    'part' in payload &&
    typeof payload.part === 'string' &&
    'edition' in payload &&
    typeof payload.edition === 'object' &&
    payload.edition !== null;

const Lines = ({
    segments,
    dashed,
    width,
    height,
}: {
    segments: Segment[];
    dashed?: boolean;
    width: number;
    height: number;
}) => {
    if (segments.length === 0) {
        return null;
    }

    return (
        <svg
            width={mm(width)}
            height={mm(height)}
            viewBox={`0 0 ${String(width)} ${String(height)}`}
            style={{ position: 'absolute', left: 0, top: 0 }}
        >
            {segments.map((s, i) => (
                <line
                    key={i}
                    x1={s.x1}
                    y1={s.y1}
                    x2={s.x2}
                    y2={s.y2}
                    stroke="#000"
                    strokeWidth={0.1}
                    strokeDasharray={dashed === true ? '1 1' : undefined}
                />
            ))}
        </svg>
    );
};

const Item = ({
    item,
    ctx,
    calibrationLabel,
}: {
    item: PageItem;
    ctx: ArtContext;
    calibrationLabel: string;
}) => {
    const calibration = item.kind === 'calibration';
    const box = calibration ? item.trim : item.bleed;

    return (
        <div
            data-item={item.id}
            style={{
                position: 'absolute',
                left: mm(box.x),
                top: mm(box.y),
                width: mm(box.w),
                height: mm(box.h),
                overflow: calibration ? 'visible' : 'hidden',
                // `overflow: hidden` alone leaves a stray strip of a turned sticker's background
                // outside the box in Chrome's PDF; the clip path removes it.
                clipPath: calibration ? undefined : 'inset(0)',
                // Chrome fragments a turned sticker that crosses the bottom of its page and draws the first
                // fragment away from its place (a space on the fold of a board panel). Containment makes
                // the item one unbreakable box.
                contain: calibration ? undefined : 'size layout paint',
            }}
        >
            {calibration ? (
                <CalibrationArt
                    item={item}
                    resolved={ctx.resolved}
                    label={calibrationLabel}
                    photo={(key) => photoOf(ctx, key)}
                />
            ) : (
                <ItemArt ctx={ctx} item={item} />
            )}
        </div>
    );
};

const Page = ({
    page,
    ctx,
    shave,
    last,
    sheet,
}: {
    page: PageSpec;
    ctx: ArtContext;
    shave: number;
    last: boolean;
    sheet?: { number: number; of: number };
}) => {
    const { language, currency, words } = ctx.resolved;
    // Pages that are exactly the item with bleed (panels, cards, lid) carry nothing but the artwork.
    const label =
        page.cropMarks.length > 0 ||
        page.items.some((item) => item.kind === 'calibration')
            ? pageLabel(page, language, currency.id, words.customSymbol, sheet)
            : null;
    const span = labelSpan(page);

    return (
        <section
            data-page
            style={{
                position: 'relative',
                width: mm(page.size.w),
                height: mm(page.size.h - shave),
                overflow: 'hidden',
                background: '#fff',
                breakAfter: last ? 'auto' : 'page',
                pageBreakAfter: last ? 'auto' : 'always',
            }}
        >
            {page.items.map((item) => (
                <Item
                    key={item.id}
                    item={item}
                    ctx={ctx}
                    calibrationLabel={localizeLabel(item.label, language)}
                />
            ))}
            <Lines
                segments={page.cropMarks}
                width={page.size.w}
                height={page.size.h}
            />
            <Lines
                segments={page.foldLines}
                dashed
                width={page.size.w}
                height={page.size.h}
            />
            {label !== null && (
                <div
                    data-page-label=""
                    style={{
                        position: 'absolute',
                        left: mm((span.left + span.right) / 2),
                        top: mm(2),
                        transform: 'translateX(-50%)',
                        fontFamily: "'Instrument Sans', sans-serif",
                        fontSize: mm(3),
                        whiteSpace: 'nowrap',
                    }}
                >
                    {label}
                </div>
            )}
        </section>
    );
};

const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

/** The font size of every fitted text: when it stops changing, the text has settled. */
const fitSnapshot = (): string => {
    return Array.from(
        document.querySelectorAll('[data-font-size-mm]'),
        (node) => node.getAttribute('data-font-size-mm'),
    ).join(',');
};

/**
 * Hides everything that lies completely outside its page (the 36 other spaces on a board panel, the card
 * spots that sit on another panel). Chrome shrinks the whole document to fit when such content exists, even
 * inside a box with `overflow: hidden`, and every page then prints at the wrong scale (measured with
 * Chrome 131). Content that is partly on the page is clipped by the page as usual.
 */
export const cullOutsidePages = (root: ParentNode): number => {
    const outside: HTMLElement[] = [];

    const visit = (parent: Element, bounds: DOMRect): void => {
        for (const child of Array.from(parent.children)) {
            const rect = child.getBoundingClientRect();
            const away =
                rect.width > 0 &&
                rect.height > 0 &&
                (rect.right <= bounds.left ||
                    rect.left >= bounds.right ||
                    rect.bottom <= bounds.top ||
                    rect.top >= bounds.bottom);

            if (away && child instanceof HTMLElement) {
                outside.push(child);
            } else {
                visit(child, bounds);
            }
        }
    };

    for (const page of root.querySelectorAll<HTMLElement>('[data-page]')) {
        visit(page, page.getBoundingClientRect());
    }

    for (const element of outside) {
        element.style.display = 'none';
    }

    return outside.length;
};

/**
 * Raises the flag the PDF job waits on, when the fonts are loaded, the fitted texts have stopped changing
 * (they measure again once fonts are ready) and every image is decoded (B54, B55).
 */
export const useReadySignal = (): void => {
    useEffect(() => {
        let cancelled = false;

        const settle = async (): Promise<void> => {
            await document.fonts.ready;

            let previous = fitSnapshot();
            let stable = 0;

            for (
                let round = 0;
                round < 40 && stable < 3 && !cancelled;
                round++
            ) {
                await sleep(40);
                const next = fitSnapshot();

                stable = next === previous ? stable + 1 : 0;
                previous = next;
            }

            const images = Array.from(document.querySelectorAll('img'));

            await Promise.all(
                images.map((image) =>
                    image.complete
                        ? Promise.resolve()
                        : // A picture that does not decode is counted below as broken.
                          image.decode().catch((error: unknown) => {
                              if (!(error instanceof DOMException)) {
                                  throw error;
                              }
                          }),
                ),
            );
            const broken = images.filter((image) => image.naturalWidth === 0);

            if (broken.length > 0) {
                window.printError = `${String(broken.length)} images did not load`;
            }

            cullOutsidePages(document);

            window.printOverflow = document.querySelectorAll(
                '[data-fits="false"]',
            ).length;

            if (!cancelled) {
                window.printReady = true;
            }
        };

        settle().catch((error: unknown) => {
            // The page is gone (unmounted, or the test environment was torn down): nobody reads this.
            if (cancelled || typeof window === 'undefined') {
                return;
            }
            window.printError = String(error);
            window.printReady = true;
        });

        return () => {
            cancelled = true;
        };
    }, []);
};

/**
 * The print page: every page of one part in one set, at true size (B54, B56), drawn by the real renderers
 * (components/render). Which element sits where comes from composePages (resources/js/lib/render/print-composition.ts).
 */
export const PrintDocument = ({ payload }: { payload: PrintPayload }) => {
    const { pages, ctx } = useMemo(() => {
        const edition = allPartsOn(toEdition(payload.edition));

        return {
            pages: composePages(
                payload.part,
                payload.set,
                payload.edition,
                payload.edition.boardProfile ?? undefined,
            ),
            ctx: {
                edition,
                resolved: resolveEdition(edition),
                set: payload.set,
                parts: payload.edition.parts,
            } satisfies ArtContext,
        };
    }, [payload]);
    useReadySignal();

    return (
        <RasterNotePattern.Provider value>
            {pages.map((page, index) => (
                <Page
                    key={index}
                    page={page}
                    ctx={ctx}
                    shave={payload.pageShaveMm}
                    last={index === pages.length - 1}
                    {...(payload.part === 'money'
                        ? { sheet: { number: index + 1, of: pages.length } }
                        : {})}
                />
            ))}
        </RasterNotePattern.Provider>
    );
};
