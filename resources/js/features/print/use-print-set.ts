import { useEffect, useRef, useState } from 'react';
import {
    initialSet,
    rememberSet,
    setInUrl,
} from '@/features/print/print-page-setup';
import type { Edition } from '@/lib/render/edition-types';
import type { PrintSet } from '@/types/generated';

export const usePrintSet = (
    localEditionId: string | null,
    checked: Edition | null,
) => {
    const [set, setSet] = useState<PrintSet>(() => initialSet(localEditionId));
    /** The person switched sets here: the set the edition remembers no longer takes over. */
    const pickedSet = useRef(setInUrl());
    // Once the edition of this browser has loaded, open on the set it remembers (B199), unless the address or the
    // person chose one already.
    const rememberedSet = checked?.printSelection?.set;
    useEffect(() => {
        if (rememberedSet !== undefined && !pickedSet.current) {
            pickedSet.current = true;
            setSet(rememberedSet);
        }
    }, [rememberedSet]);

    const pick = (next: PrintSet): void => {
        pickedSet.current = true;
        setSet(next);
        rememberSet(localEditionId, next);
    };

    return { set, pick, rememberedSet };
};
