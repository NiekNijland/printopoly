import { useMemo } from 'react';
import type { PrintServices } from '@/features/print/print-page-setup';
import { useLocalPrintEdition } from '@/features/print/use-local-print-edition';
import type { PrintPageProps } from '@/features/print/use-print-page';
import { usePrintPhotos } from '@/features/print/use-print-photos';
import { useStoredEdition } from '@/features/print/use-stored-edition';
import type { Edition } from '@/lib/render/edition-types';
import { toEdition } from '@/lib/render/print-edition';
import { sampleEdition } from '@/lib/render/sample-edition';
import type { Locale } from '@/types/game';

export const usePrintEditions = (
    { job, editionData, localEditionId }: PrintPageProps,
    services: PrintServices,
    locale: Locale,
) => {
    const loaded = useLocalPrintEdition(job, services, locale);
    const [stored, setStored] = useStoredEdition(job, localEditionId, services);
    const { local } = loaded;
    const drawn = useMemo<Edition>(() => {
        if (editionData !== null) {
            return toEdition(editionData);
        }

        return (
            local ?? {
                ...sampleEdition(locale === 'en' ? 'en' : 'nl'),
                elements: {},
                name: '',
            }
        );
    }, [editionData, local, locale]);
    const checked = job === null ? local : stored;
    const photos = usePrintPhotos(services, drawn, checked);
    const ready =
        editionData !== null || local !== null || localEditionId === null;

    return {
        ...loaded,
        drawn,
        checked,
        photos,
        ready,
        saved: job === null ? loaded.setLocal : setStored,
    };
};
