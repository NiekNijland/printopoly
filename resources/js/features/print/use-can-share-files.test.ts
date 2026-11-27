import { renderHook } from '@testing-library/react';

import { useCanShareFiles } from './use-can-share-files';

describe('useCanShareFiles', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('says whether the browser can hand files to another app (R5-30)', () => {
        expect(renderHook(() => useCanShareFiles()).result.current).toBe(false);

        vi.stubGlobal('navigator', {
            ...window.navigator,
            canShare: () => true,
        });
        expect(renderHook(() => useCanShareFiles()).result.current).toBe(true);
    });
});
