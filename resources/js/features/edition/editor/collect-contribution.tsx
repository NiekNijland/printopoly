import { useEffect, useState } from 'react';

import { fetchContributionPhoto } from '@/features/edition/boxes/api';
import type { BoxContributionData } from '@/features/edition/boxes/types';
import { reportUnlessOffline } from '@/lib/bugsnag';

/** The small version of a contribution's photo as an object URL; only the owner may fetch it. */
export const useContributionPhoto = (
    contribution: BoxContributionData,
    secret: string | null,
): string | null => {
    const [url, setUrl] = useState<string | null>(null);
    const source = contribution.photoUrl;

    useEffect(() => {
        if (source === null) {
            return;
        }
        let cancelled = false;
        let created: string | null = null;
        fetchContributionPhoto(source, secret, 'preview')
            .then((blob) => {
                if (cancelled) {
                    return;
                }
                created = URL.createObjectURL(blob);
                setUrl(created);
            })
            .catch(reportUnlessOffline);

        return () => {
            cancelled = true;
            if (created !== null) {
                URL.revokeObjectURL(created);
            }
            setUrl(null);
        };
    }, [source, secret]);

    return url;
};
