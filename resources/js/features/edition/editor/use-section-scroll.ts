import { useEffect, useRef, useState, type RefObject } from 'react';

import { sectionId } from '@/features/edition/editor/panel-section';
import {
    EDITION_SECTIONS,
    type EditionSection,
} from '@/lib/render/editor-edition-panel';

const useReleaseOnHandScroll = (
    scroller: RefObject<HTMLDivElement | null>,
    chosen: RefObject<boolean>,
): void => {
    // The person scrolls by hand: the panel follows the scroll again.
    useEffect(() => {
        const box = scroller.current;
        if (box === null) {
            return;
        }
        const release = (): void => {
            chosen.current = false;
        };
        const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
        events.forEach((name) =>
            box.addEventListener(name, release, { passive: true }),
        );

        return () =>
            events.forEach((name) => box.removeEventListener(name, release));
    }, [scroller, chosen]);
};

export const useSectionScroll = (
    hasBox: boolean,
    request: { section: EditionSection; n: number } | null,
) => {
    // Samen maken is frozen (B202): its section stays for an edition that has a box, so the friends' work can still
    // come in, and a new edition never sees it (R5-16).
    const sections = EDITION_SECTIONS.filter(
        (section) => section !== 'together' || hasBox,
    );
    const [open, setOpen] = useState<ReadonlySet<EditionSection>>(
        () => new Set(['general']),
    );
    const scroller = useRef<HTMLDivElement>(null);
    // A chosen jump link stays lit while the panel scrolls to it, also when the section is too short to reach the
    // top, until the person scrolls by hand (Lukas: "Board size" lit "Make it together").
    const chosen = useRef(false);
    useReleaseOnHandScroll(scroller, chosen);
    // The section in sight, so its jump link shows where you are (vindbaarheid point 4).
    const [current, setCurrent] = useState<EditionSection>('general');
    const follow = (): void => {
        const box = scroller.current;
        if (box === null) {
            return;
        }
        const top = box.getBoundingClientRect().top + 24;
        if (chosen.current) {
            return;
        }
        const atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 2;
        let seen: EditionSection = 'general';
        for (const section of sections) {
            const node = document.getElementById(sectionId(section));
            if (node !== null && node.getBoundingClientRect().top <= top) {
                seen = section;
            }
        }
        // The last sections are short: at the bottom of the panel the last one counts.
        setCurrent(
            atEnd && box.scrollTop > 0 ? (sections.at(-1) ?? seen) : seen,
        );
    };

    const show = (section: EditionSection): void => {
        setOpen((now) => new Set(now).add(section));
        setCurrent(section);
        chosen.current = true;
        // After the section unfolds: scroll inside the panel, never the page around it.
        requestAnimationFrame(() => {
            const node = document.getElementById(sectionId(section));
            const box = scroller.current;
            if (node === null || box === null) {
                return;
            }
            box.scrollTop +=
                node.getBoundingClientRect().top -
                box.getBoundingClientRect().top -
                8;
        });
    };

    const lastRequest = useRef(0);
    useEffect(() => {
        if (request !== null && request.n !== lastRequest.current) {
            lastRequest.current = request.n;
            show(request.section);
        }
    }, [request]);

    const toggle = (section: EditionSection): void =>
        setOpen((now) => {
            const next = new Set(now);
            if (next.has(section)) {
                next.delete(section);
            } else {
                next.add(section);
            }

            return next;
        });

    return { sections, open, scroller, current, follow, show, toggle };
};
