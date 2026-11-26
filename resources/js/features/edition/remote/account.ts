import {
    RemoteApiError,
    createApiClient,
    isJsonObject,
    type ApiClient,
} from './client';

export interface LogoutResult {
    /** Always true: logging out wipes the copy of the editions in this browser (Staten, accountmenu). */
    clearLocalCopy: boolean;
    redirect: string;
}

interface DeleteAccountResult {
    deleted: true;
    redirect: string;
}

export type DeleteAccountOutcome =
    | { ok: true; result: DeleteAccountResult }
    | { ok: false; reason: 'confirmation'; message: string };

function redirectOf(body: unknown, fallback: string): string {
    return isJsonObject(body) && typeof body.redirect === 'string'
        ? body.redirect
        : fallback;
}

/**
 * Logs out through JSON. The caller then clears IndexedDB when `clearLocalCopy` is true and goes to `redirect`. A
 * logout through an Inertia link instead lands on a page with the flash prop `clearLocalCopy`.
 */
export async function logout(
    client: ApiClient = createApiClient(),
): Promise<LogoutResult> {
    const response = await client.request('POST', '/logout');
    if (!response.ok) {
        throw new RemoteApiError(response.status, response.body);
    }

    return {
        clearLocalCopy:
            isJsonObject(response.body) &&
            response.body.clearLocalCopy === true,
        redirect: redirectOf(response.body, '/'),
    };
}

/**
 * Deletes the account with its editions and uploads (B68). The server checks `confirmation`, the e-mail address of the
 * account as the user typed it. A wrong one comes back as a value to show in the dialog.
 */
export async function deleteAccount(
    confirmation: string,
    client: ApiClient = createApiClient(),
): Promise<DeleteAccountOutcome> {
    const response = await client.request('DELETE', '/api/account', {
        confirmation,
    });
    if (response.status === 422) {
        const errors = isJsonObject(response.body)
            ? response.body.errors
            : undefined;
        const first: unknown =
            isJsonObject(errors) && Array.isArray(errors.confirmation)
                ? (errors.confirmation as unknown[])[0]
                : undefined;

        return {
            ok: false,
            reason: 'confirmation',
            message: typeof first === 'string' ? first : '',
        };
    }
    if (!response.ok) {
        throw new RemoteApiError(response.status, response.body);
    }

    return {
        ok: true,
        result: { deleted: true, redirect: redirectOf(response.body, '/') },
    };
}
