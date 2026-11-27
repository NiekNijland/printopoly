import { useEffect, useState } from 'react';

import { prepareFriendPhoto } from '@/features/edition/boxes/friend-photo';
import { useTranslation } from '@/hooks/use-translation';
import type { Locale } from '@/types/game';

export type ChosenPhoto = {
    upload: Blob;
    url: string;
    width: number;
    height: number;
};

export const useFriendPhoto = (
    locale: Locale,
    photoMegabytes: number,
    onProblem: (problem: string | null) => void,
) => {
    const t = useTranslation();
    const [photo, setPhoto] = useState<ChosenPhoto | null>(null);
    const [working, setWorking] = useState(false);

    const photoUrl = photo?.url;
    useEffect(
        () => () => {
            if (photoUrl !== undefined) {
                URL.revokeObjectURL(photoUrl);
            }
        },
        [photoUrl],
    );

    const choose = async (chosen: File): Promise<void> => {
        onProblem(null);
        setWorking(true);
        try {
            const prepared = await prepareFriendPhoto(chosen, locale);
            if (!prepared.ok) {
                onProblem(prepared.message);

                return;
            }
            if (prepared.upload.size > photoMegabytes * 1024 * 1024) {
                onProblem(t('photo.too_large', { mb: photoMegabytes }));

                return;
            }
            setPhoto({
                upload: prepared.upload,
                url: URL.createObjectURL(prepared.preview),
                width: prepared.width,
                height: prepared.height,
            });
        } finally {
            setWorking(false);
        }
    };

    return { photo, working, choose, clear: () => setPhoto(null) };
};
