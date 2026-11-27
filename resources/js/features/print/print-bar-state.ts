import type { BarActivity, BarProblem } from '@/features/print/print-bar';
import { formatMegabytes } from '@/features/print/print-format';
import type { UploadProgress } from '@/lib/render/print-upload-progress';

type Translate = (
    key: string,
    replacements?: Record<string, string | number>,
) => string;

type ProblemState = {
    online: boolean;
    lost: { retry: () => void } | null;
    uploading: UploadProgress | null;
    throttle: { seconds: number; retryNow: () => void } | null;
    error: string | null;
};

export const barProblem = (
    state: ProblemState,
    t: Translate,
): BarProblem | null => {
    const { online, lost, uploading, throttle, error } = state;

    if (!online || lost !== null || uploading?.offline === true) {
        return {
            message: t('print.offline'),
            seconds: null,
            ...(lost === null || !online ? {} : { onRetryNow: lost.retry }),
        };
    }

    if (throttle !== null) {
        return {
            message: t('print.throttled', { seconds: throttle.seconds }),
            seconds: throttle.seconds,
            onRetryNow: throttle.retryNow,
        };
    }

    return error === null ? null : { message: error, seconds: null };
};

/**
 * What is happening right now, next to the button (bug 11 of test round 4): the upload with its photos and
 * megabytes, or the edition being set up.
 */
export const barActivity = (
    working: boolean,
    uploading: UploadProgress | null,
    locale: string,
    t: Translate,
): BarActivity | null => {
    if (!working) {
        return null;
    }

    return uploading === null || uploading.total === 0
        ? { message: t('print.starting'), fraction: null }
        : {
              message: t('print.uploading', {
                  done: uploading.done,
                  total: uploading.total,
                  sent: formatMegabytes(uploading.sentBytes, locale),
                  size: formatMegabytes(uploading.totalBytes, locale),
              }),
              fraction:
                  uploading.totalBytes === 0
                      ? null
                      : uploading.sentBytes / uploading.totalBytes,
          };
};
