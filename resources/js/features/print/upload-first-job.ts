import { router } from '@inertiajs/react';

import type { PrintServices } from '@/features/print/print-page-setup';
import {
    previousJobToken,
    startRun,
    uploadPrintJob,
    type SetChoice,
} from '@/lib/render/print-api';
import type { UploadProgress } from '@/lib/render/print-upload-progress';
import { generate } from '@/routes/print';
import { store as storePrintJob } from '@/routes/print-jobs';
import type { Locale } from '@/types/game';
import type { PrintPart, PrintSet } from '@/types/generated';

type FirstJob = {
    services: PrintServices;
    locale: Locale;
    forSet: PrintSet;
    chosen: PrintPart[];
    choice: SetChoice;
    onProgress: (progress: UploadProgress | null) => void;
};

/**
 * A job without an account: the browser sends the edition and its photos once (B80). The job of an earlier
 * version goes along, so the PDFs that did not change are taken over (UX 3).
 */
export const uploadFirstJob = async (first: FirstJob): Promise<boolean> => {
    const { services, locale, forSet, chosen, choice } = first;
    const local = await services.loadUpload();

    if (local === null) {
        return false;
    }

    const created = await uploadPrintJob(
        {
            ...local,
            previous: await previousJobToken(
                local.edition.id,
                services.storage(),
            ),
        },
        storePrintJob().url,
        first.onProgress,
    );
    first.onProgress(null);
    await services.rememberJob(local.edition, created.token);
    // The choices go with the first run, so the job page counts the same parts (bug 6).
    await startRun(
        generate({ printJob: created.token }).url,
        forSet,
        chosen,
        undefined,
        choice,
        locale,
    );
    router.visit(`${created.url}?set=${forSet}`);

    return true;
};
