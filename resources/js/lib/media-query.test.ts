import { mediaQueryList } from '@/testing/media-query';

import { mediaMatches, subscribeMedia } from './media-query';

describe('media query', () => {
    it('answers the query, and the fallback where there is no matchMedia', () => {
        vi.stubGlobal(
            'matchMedia',
            vi.fn((query: string) => mediaQueryList(query, true)),
        );
        expect(mediaMatches('(pointer: coarse)')).toBe(true);

        vi.stubGlobal('window', {});
        expect(mediaMatches('(pointer: coarse)', true)).toBe(true);
        expect(mediaMatches('(pointer: coarse)')).toBe(false);
        expect(subscribeMedia('(pointer: coarse)', () => undefined)()).toBe(
            undefined,
        );
    });

    it('follows changes until the returned function stops it', () => {
        const list = mediaQueryList('(min-width: 768px)', false);
        vi.stubGlobal(
            'matchMedia',
            vi.fn(() => list),
        );
        const changed = vi.fn<() => void>();
        const stop = subscribeMedia('(min-width: 768px)', changed);

        list.dispatchEvent(new Event('change'));
        stop();
        list.dispatchEvent(new Event('change'));

        expect(changed).toHaveBeenCalledOnce();
    });
});
