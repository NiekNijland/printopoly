import { useEffect, useMemo } from 'react';

import {
    composePages,
    type PageSpec,
    type PrintEdition,
    type PrintPart,
    type PrintSet,
} from '@/lib/print/composition';
import type { Segment } from '@/lib/print/types';
import { PlaceholderItem } from './placeholder-item';

export interface PrintPayload {
    part: PrintPart;
    set: PrintSet;
    /** Pages are this much shorter than the sheet so Chrome adds no blank page (B63). */
    pageShaveMm: number;
    edition: PrintEdition;
}

declare global {
    interface Window {
        __PRINT__?: PrintPayload;
        /** True once fonts and images are loaded: the PDF job waits for it (B54). */
        printReady?: boolean;
        printError?: string;
    }
}

function Lines({
    segments,
    dashed,
    width,
    height,
}: {
    segments: Segment[];
    dashed?: boolean;
    width: number;
    height: number;
}) {
    if (segments.length === 0) {
        return null;
    }

    return (
        <svg
            width={`${String(width)}mm`}
            height={`${String(height)}mm`}
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
}

function Page({
    page,
    edition,
    shave,
    last,
}: {
    page: PageSpec;
    edition: PrintEdition;
    shave: number;
    last: boolean;
}) {
    return (
        <section
            data-page
            style={{
                position: 'relative',
                width: `${String(page.size.w)}mm`,
                height: `${String(page.size.h - shave)}mm`,
                overflow: 'hidden',
                background: '#fff',
                breakAfter: last ? 'auto' : 'page',
                pageBreakAfter: last ? 'auto' : 'always',
            }}
        >
            {page.items.map((item) => (
                <PlaceholderItem key={item.id} item={item} edition={edition} />
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
            {page.label !== null && (
                <div
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: '2mm',
                        transform: 'translateX(-50%)',
                        fontFamily: 'sans-serif',
                        fontSize: '3mm',
                    }}
                >
                    {page.label}
                </div>
            )}
        </section>
    );
}

/** Waits for fonts and every image, then raises the flag the PDF job waits on. */
function useReadySignal(): void {
    useEffect(() => {
        let cancelled = false;

        async function settle(): Promise<void> {
            await document.fonts.ready;
            const images = Array.from(document.querySelectorAll('img'));

            await Promise.all(
                images.map((image) =>
                    image.complete
                        ? Promise.resolve()
                        : image.decode().catch(() => undefined),
                ),
            );
            const broken = images.filter((image) => image.naturalWidth === 0);

            if (broken.length > 0) {
                window.printError = `${String(broken.length)} images did not load`;
            }
            if (!cancelled) {
                window.printReady = true;
            }
        }

        settle().catch((error: unknown) => {
            window.printError = String(error);
            window.printReady = true;
        });

        return () => {
            cancelled = true;
        };
    }, []);
}

/**
 * The print page: every page of one part in one set, at true size (B54, B56).
 * Which element sits where comes from composePages (resources/js/lib/print).
 */
export function PrintDocument({ payload }: { payload: PrintPayload }) {
    const pages = useMemo(
        () =>
            composePages(
                payload.part,
                payload.set,
                payload.edition,
                payload.edition.boardProfile ?? undefined,
            ),
        [payload],
    );
    useReadySignal();

    return (
        <>
            {pages.map((page, index) => (
                <Page
                    key={index}
                    page={page}
                    edition={payload.edition}
                    shave={payload.pageShaveMm}
                    last={index === pages.length - 1}
                />
            ))}
        </>
    );
}
