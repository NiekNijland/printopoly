import { act, renderHook } from '@testing-library/react';
import { LaravelReactI18nProvider } from 'laravel-react-internationalization';
import type { ReactNode } from 'react';

import nl from '../../../../../lang/nl.json';

import { useFriendPhoto } from './use-friend-photo';

const prepare = vi.hoisted(() => ({ friendPhoto: vi.fn() }));

vi.mock('./friend-photo', () => ({
    prepareFriendPhoto: prepare.friendPhoto,
}));

const Dutch = ({ children }: { children: ReactNode }) => (
    <LaravelReactI18nProvider
        locale="nl"
        fallbackLocale="nl"
        files={{ '/lang/nl.json': nl }}
    >
        {children}
    </LaravelReactI18nProvider>
);

const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });

describe('useFriendPhoto', () => {
    beforeEach(() => {
        prepare.friendPhoto.mockReset();
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    });

    it('keeps a photo that fits with its preview, and lets the preview go when it is cleared', async () => {
        const revoke = vi
            .spyOn(URL, 'revokeObjectURL')
            .mockReturnValue(undefined);
        prepare.friendPhoto.mockResolvedValue({
            ok: true,
            upload: new Blob(['u']),
            preview: new Blob(['p']),
            width: 800,
            height: 600,
        });
        const onProblem = vi.fn();
        const { result } = renderHook(() => useFriendPhoto('nl', 1, onProblem));

        await act(() => result.current.choose(file));

        expect(onProblem).toHaveBeenCalledWith(null);
        expect(result.current).toMatchObject({
            working: false,
            photo: { url: 'blob:preview', width: 800, height: 600 },
        });

        act(() => result.current.clear());

        expect(result.current.photo).toBeNull();
        expect(revoke).toHaveBeenCalledWith('blob:preview');
    });

    it('says why a photo cannot be used', async () => {
        prepare.friendPhoto
            .mockResolvedValueOnce({ ok: false, message: 'Geen foto.' })
            .mockResolvedValueOnce({
                ok: true,
                upload: new Blob([new Uint8Array(2 * 1024 * 1024)]),
                preview: new Blob(['p']),
                width: 1,
                height: 1,
            });
        const onProblem = vi.fn();
        const { result } = renderHook(
            () => useFriendPhoto('nl', 1, onProblem),
            { wrapper: Dutch },
        );

        await act(() => result.current.choose(file));
        expect(onProblem).toHaveBeenLastCalledWith('Geen foto.');

        await act(() => result.current.choose(file));
        expect(onProblem).toHaveBeenLastCalledWith(
            'Deze foto is groter dan 1 MB. Kies een kleinere versie.',
        );
        expect(result.current.photo).toBeNull();
    });
});
