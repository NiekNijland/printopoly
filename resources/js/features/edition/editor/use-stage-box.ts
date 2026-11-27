import { useEffect, useRef, useState, type RefObject } from 'react';

export const useStageBox = (
    host: HTMLDivElement | null,
): { w: number; h: number } => {
    const [box, setBox] = useState({ w: 0, h: 0 });

    useEffect(() => {
        if (host === null || typeof ResizeObserver === 'undefined') {
            return;
        }
        const observer = new ResizeObserver((entries) => {
            const rect = entries[0]?.contentRect;
            if (rect !== undefined) {
                setBox({ w: rect.width, h: rect.height });
            }
        });
        observer.observe(host);

        return () => observer.disconnect();
    }, [host]);

    return box;
};

export const useMeasuredWidth = <T extends HTMLElement>(): [
    RefObject<T | null>,
    number,
] => {
    const box = useRef<T>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const node = box.current;
        if (node === null) {
            return;
        }
        const measure = (): void => setWidth(node.clientWidth);
        measure();
        if (typeof ResizeObserver === 'undefined') {
            return;
        }
        const observer = new ResizeObserver(measure);
        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    return [box, width];
};
