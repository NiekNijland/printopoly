import { act, renderHook } from '@testing-library/react';

import { useWorkspaceNavigation } from './use-workspace-navigation';

describe('useWorkspaceNavigation', () => {
    it('starts from the address and lets go of the element only when another is chosen', () => {
        const onLeaveElement = vi.fn<() => void>();
        const { result } = renderHook(() =>
            useWorkspaceNavigation(
                {
                    messages: false,
                    element: { key: 'space.05', field: 'name' },
                },
                onLeaveElement,
            ),
        );

        expect(result.current.navigation).toMatchObject({
            selectedKey: 'space.05',
            mobileElement: true,
            focusRequest: { n: 1, field: 'name' },
        });

        act(() => result.current.navigate({ type: 'select', key: 'space.05' }));
        act(() => result.current.navigate({ type: 'go-to', key: 'space.06' }));

        expect(onLeaveElement).not.toHaveBeenCalled();
        expect(result.current.navigation.selectedKey).toBe('space.06');

        act(() => result.current.navigate({ type: 'select', key: 'space.07' }));

        expect(onLeaveElement).toHaveBeenCalledOnce();
        expect(result.current.navigation.selectedKey).toBe('space.07');
    });
});
