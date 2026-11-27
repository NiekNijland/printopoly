import { useEffect, useState } from 'react';

type Flash = { text: string; ms: number };

/** A short note at the bottom: "Bewaard" after Ctrl+S, what came back after undo or redo (UX 7). */
export const useFlash = () => {
    const [flash, setFlash] = useState<Flash | null>(null);

    useEffect(() => {
        if (flash === null) {
            return undefined;
        }
        const timer = window.setTimeout(() => setFlash(null), flash.ms);

        return () => window.clearTimeout(timer);
    }, [flash]);

    const showFlash = (text: string, ms = 2000): void => setFlash({ text, ms });

    return { flash: flash?.text ?? null, showFlash };
};
