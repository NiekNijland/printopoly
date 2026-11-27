import { useEffect, useState } from 'react';

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
