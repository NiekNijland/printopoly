import { useEffect, useState } from 'react';

import { readAskedPart } from '@/features/print/print-page-setup';
import type { SetPart } from '@/lib/render/print-selection';

/**
 * "niet in je set" in the editor opens the page at the row of that part (R6 Kees): `?part=tokens`. The asked row
 * comes into view once the edition is there, and stands out for a moment.
 */
export const useAskedPart = (loaded: boolean): SetPart | null => {
    const [askedPart, setAskedPart] = useState<SetPart | null>(readAskedPart);

    useEffect(() => {
        if (askedPart === null || !loaded) {
            return;
        }
        document
            .getElementById(`part-${askedPart}`)
            ?.scrollIntoView({ block: 'center' });
        const timer = window.setTimeout(() => {
            setAskedPart(null);
        }, 4000);

        return () => {
            window.clearTimeout(timer);
        };
    }, [askedPart, loaded]);

    return askedPart;
};
