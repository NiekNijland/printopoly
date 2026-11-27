import { renderHook } from '@testing-library/react';
import { LaravelReactI18nProvider } from 'laravel-react-internationalization';
import type { ReactNode } from 'react';

import { memorySession } from '@/features/edition/testing/session';
import { sampleEdition } from '@/testing/editions';
import nl from '../../../../../../lang/nl.json';

import { usePhotoGestures } from './use-photo-gestures';

const wrapper = ({ children }: { children: ReactNode }) => (
    <LaravelReactI18nProvider
        locale="nl"
        fallbackLocale="nl"
        files={{ '/lang/nl.json': nl }}
    >
        {children}
    </LaravelReactI18nProvider>
);

describe('usePhotoGestures', () => {
    it('offers no gestures and changes nothing for an element without a photo', () => {
        const session = memorySession(sampleEdition());
        const apply = vi.spyOn(session, 'apply');
        const { result } = renderHook(
            () =>
                usePhotoGestures({
                    session,
                    editKey: 'space.01',
                    targetKey: 'space.01',
                    part: undefined,
                    photos: new Map(),
                    boardProfile: sampleEdition().boardProfile,
                }),
            { wrapper },
        );

        result.current.act({ type: 'rotate', turns: 1 });

        expect(result.current.gestures).toBeUndefined();
        expect(result.current.context).toBeNull();
        expect(result.current.photo).toBeUndefined();
        expect(apply).not.toHaveBeenCalled();
        expect(result.current.zoomText(1.234)).toBe('Zoom 123%');
    });
});
