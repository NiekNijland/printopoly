import { renderHook, waitFor } from '@testing-library/react';

import type { BoxContributionData } from '@/features/edition/boxes/types';
import { requestOf, stubFetch } from '@/testing/fetch';

import { useContributionPhoto } from './collect-contribution';

const contribution = (photoUrl: string | null): BoxContributionData => ({
    id: 'c1',
    elementKey: 'space.01',
    firstName: 'Sanne',
    field: 'name',
    value: 'Beukenlaan',
    amount: null,
    open: ['photo'],
    hasPhoto: photoUrl !== null,
    width: 800,
    height: 600,
    photoUrl,
    createdAt: 1,
});

describe('useContributionPhoto', () => {
    beforeEach(() => {
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    });

    it('has no photo for a contribution without one', () => {
        const fake = stubFetch();

        const { result } = renderHook(() =>
            useContributionPhoto(contribution(null), 'owner'),
        );

        expect(result.current).toBeNull();
        expect(fake).not.toHaveBeenCalled();
    });

    it('fetches the small version with the owner secret and lets it go after', async () => {
        const revoke = vi
            .spyOn(URL, 'revokeObjectURL')
            .mockReturnValue(undefined);
        const fake = stubFetch(() => new Response(new Blob(['img'])));

        const { result, unmount } = renderHook(() =>
            useContributionPhoto(contribution('/photo/c1'), 'owner'),
        );

        await waitFor(() => expect(result.current).toBe('blob:preview'));
        const { url, init } = requestOf(fake);
        expect(url).toBe('/photo/c1?size=preview');
        expect(new Headers(init.headers).get('X-Box-Owner')).toBe('owner');

        unmount();
        expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:preview');
    });

    it('shows nothing when the photo cannot be fetched', async () => {
        const fake = stubFetch(() => new Response(null, { status: 403 }));

        const { result } = renderHook(() =>
            useContributionPhoto(contribution('/photo/c1'), null),
        );

        await waitFor(() => expect(fake).toHaveBeenCalledTimes(1));
        expect(result.current).toBeNull();
    });

    it('makes no object URL for a photo that arrives after it closed', async () => {
        const create = vi.spyOn(URL, 'createObjectURL');
        let answer: (response: Response) => void = () => undefined;
        stubFetch(
            () =>
                new Promise<Response>((resolve) => {
                    answer = resolve;
                }),
        );
        const { unmount } = renderHook(() =>
            useContributionPhoto(contribution('/photo/c1'), null),
        );

        unmount();
        answer(new Response(new Blob(['img'])));
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(create).not.toHaveBeenCalled();
    });
});
