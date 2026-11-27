import { THROTTLE_WAIT } from '@/features/print/print-page-setup';
import { PrintApiError } from '@/lib/render/print-api-error';

export type RunFailure =
    | { kind: 'busy' }
    | { kind: 'lost' }
    | { kind: 'throttled'; seconds: number }
    | {
          kind: 'error';
          message:
              'print.error_busy' | 'print.error_photos' | 'print.error_generic';
      };

export const runFailureOf = (caught: unknown, hasJob: boolean): RunFailure => {
    const code = caught instanceof PrintApiError ? caught.status : 0;

    // A run is still going on the server: the parts stay in line and start after it.
    if (code === 409 && hasJob) {
        return { kind: 'busy' };
    }

    // No connection: say so in the bar and send it again as soon as the browser is online (bug 12).
    if (!(caught instanceof PrintApiError) && caught instanceof TypeError) {
        return { kind: 'lost' };
    }

    // Too many requests from this address: say so next to the button and try again by itself.
    if (code === 429 && caught instanceof PrintApiError) {
        return {
            kind: 'throttled',
            seconds: caught.retryAfter ?? THROTTLE_WAIT,
        };
    }

    return {
        kind: 'error',
        message:
            code === 409
                ? 'print.error_busy'
                : code === 422
                  ? 'print.error_photos'
                  : 'print.error_generic',
    };
};
