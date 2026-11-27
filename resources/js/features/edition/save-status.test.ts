import { describe, expect, it } from 'vitest';
import {
    deriveSaveStatus,
    describeSaveStatus,
    initialSaveStatusInput,
    type SaveStatusInput,
    type TimeFormatter,
} from './save-status';

const at = 1_000;
const fixedTime: TimeFormatter = () => '14:32';
const input = (patch: Partial<SaveStatusInput> = {}): SaveStatusInput => ({
    ...initialSaveStatusInput,
    lastSavedAt: at,
    ...patch,
});
const env = (patch: Partial<SaveStatusInput['environment']>) => ({
    ...initialSaveStatusInput.environment,
    ...patch,
});

describe('deriveSaveStatus', () => {
    it('is "saved locally" by default', () => {
        expect(deriveSaveStatus(input())).toEqual({
            kind: 'saved-local',
            at,
            warning: false,
        });
        expect(deriveSaveStatus(initialSaveStatusInput)).toEqual({
            kind: 'saved-local',
            warning: false,
        });
    });

    it('shows saving while a save runs', () => {
        expect(deriveSaveStatus(input({ phase: 'saving' }))).toEqual({
            kind: 'saving',
            warning: false,
        });
    });

    it('shows saved to account when logged in and synced', () => {
        const status = deriveSaveStatus(
            input({
                account: { loggedIn: true, pendingSync: false, syncedAt: 5 },
            }),
        );
        expect(status).toEqual({
            kind: 'saved-account',
            at: 5,
            warning: false,
        });
        expect(
            deriveSaveStatus(
                input({
                    account: {
                        loggedIn: true,
                        pendingSync: false,
                        syncedAt: null,
                    },
                }),
            ).at,
        ).toBe(at);
    });

    it('shows saving while changes still go to the account', () => {
        expect(
            deriveSaveStatus(
                input({
                    account: { loggedIn: true, pendingSync: true, syncedAt: 5 },
                }),
            ).kind,
        ).toBe('saving');
    });

    it('shows offline only for people with an account', () => {
        expect(
            deriveSaveStatus(
                input({
                    online: false,
                    account: { loggedIn: true, pendingSync: true, syncedAt: 5 },
                }),
            ).kind,
        ).toBe('offline');
        expect(deriveSaveStatus(input({ online: false })).kind).toBe(
            'saved-local',
        );
    });

    it('warns in a private window, even while saving', () => {
        expect(
            deriveSaveStatus(
                input({ environment: env({ privateWindow: true }) }),
            ),
        ).toMatchObject({
            kind: 'private-window',
            warning: true,
        });
        expect(
            deriveSaveStatus(
                input({
                    phase: 'saving',
                    environment: env({ privateWindow: true }),
                }),
            ).kind,
        ).toBe('private-window');
    });

    it('stays calm about Safari until something was saved (UX 10, ronde 4)', () => {
        expect(
            deriveSaveStatus(
                input({
                    lastSavedAt: null,
                    environment: env({ safariEvictionRisk: true }),
                }),
            ).kind,
        ).toBe('saved-local');
    });

    it('mentions Safari clearing data after 7 days', () => {
        expect(
            deriveSaveStatus(
                input({ environment: env({ safariEvictionRisk: true }) }),
            ).kind,
        ).toBe('safari-eviction');
        expect(
            deriveSaveStatus(
                input({
                    environment: env({ safariEvictionRisk: true }),
                    account: {
                        loggedIn: true,
                        pendingSync: false,
                        syncedAt: 1,
                    },
                }),
            ).kind,
        ).toBe('saved-account');
    });

    it('warns when storage is nearly full (B82), but not for people with an account', () => {
        expect(
            deriveSaveStatus(
                input({ environment: env({ storageLevel: 'nearly-full' }) }),
            ).kind,
        ).toBe('storage-nearly-full');
        expect(
            deriveSaveStatus(
                input({
                    environment: env({ storageLevel: 'nearly-full' }),
                    account: {
                        loggedIn: true,
                        pendingSync: false,
                        syncedAt: 1,
                    },
                }),
            ).kind,
        ).toBe('saved-account');
    });

    it('puts a failed save above everything', () => {
        expect(
            deriveSaveStatus(
                input({
                    phase: 'failed-quota',
                    environment: env({ privateWindow: true }),
                }),
            ),
        ).toEqual({
            kind: 'storage-full',
            warning: true,
        });
        expect(deriveSaveStatus(input({ phase: 'failed-other' }))).toEqual({
            kind: 'save-failed',
            warning: true,
        });
        expect(deriveSaveStatus(input({ phase: 'failed-corrupt' }))).toEqual({
            kind: 'save-corrupt',
            warning: true,
        });
    });
});

describe('describeSaveStatus', () => {
    const d = (
        status: Parameters<typeof describeSaveStatus>[0],
        locale: 'nl' | 'en' = 'nl',
    ) => describeSaveStatus(status, locale, fixedTime);

    it.each([
        [{ kind: 'saving', warning: false }, 'Opslaan…'],
        [
            { kind: 'saved-local', at, warning: false },
            'Bewaard op dit toestel · 14:32 · Inloggen met Google',
        ],
        [
            { kind: 'saved-account', at, warning: false },
            'Opgeslagen in je account · 14:32',
        ],
        [
            { kind: 'offline', at, warning: false },
            'Offline: alleen in deze browser. Zodra je weer online bent, gaat het naar je account.',
        ],
        [
            { kind: 'private-window', warning: true },
            'Privévenster: alles is weg als je dit venster sluit. Inloggen met Google',
        ],
        [
            { kind: 'safari-eviction', warning: false },
            'Bewaard op dit toestel. Safari bewaart het tot 7 dagen na je laatste bezoek. Inloggen met Google',
        ],
        [
            { kind: 'storage-full', warning: true },
            "Niet opgeslagen: de opslag van je browser is vol. Verwijder een editie of foto's om weer op te slaan. Inloggen met Google",
        ],
    ] as const)('uses the wording of the design for %j', (status, expected) => {
        expect(d(status).text).toBe(expected);
    });

    it('splits the login prompt from the message so the UI can make it a link', () => {
        expect(d({ kind: 'saved-local', at, warning: false })).toEqual({
            message: 'Bewaard op dit toestel · 14:32',
            actionLabel: 'Inloggen met Google',
            text: 'Bewaard op dit toestel · 14:32 · Inloggen met Google',
        });
        expect(
            d({ kind: 'saved-account', at, warning: false }).actionLabel,
        ).toBeNull();
        expect(d({ kind: 'offline', warning: false }).actionLabel).toBeNull();
    });

    it('leaves out the time before the first save', () => {
        expect(d({ kind: 'saved-local', warning: false }).text).toBe(
            'Bewaard op dit toestel · Inloggen met Google',
        );
    });

    it('has English wording', () => {
        expect(d({ kind: 'saved-local', at, warning: false }, 'en').text).toBe(
            'Saved on this device · 14:32 · Log in with Google',
        );
        expect(
            d({ kind: 'storage-nearly-full', warning: false }, 'en').text,
        ).toBe(
            'Your browser storage is almost full. Delete an old edition or a few photos. Log in with Google',
        );
        expect(d({ kind: 'save-failed', warning: true }).text).toContain(
            'Niet opgeslagen',
        );
        const corrupt = d({ kind: 'save-corrupt', warning: true }).text;
        expect(corrupt).toContain('beschadigd');
        expect(corrupt).not.toContain('blokkeert');
    });

    it('formats the clock', () => {
        const status = describeSaveStatus(
            {
                kind: 'saved-account',
                at: new Date(2026, 10, 20, 14, 32).getTime(),
                warning: false,
            },
            'nl',
        );
        expect(status.message).toBe('Opgeslagen in je account · 14:32');
    });
});
