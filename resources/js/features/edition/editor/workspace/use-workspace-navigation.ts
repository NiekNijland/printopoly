import { useReducer } from 'react';

import {
    navigationReducer,
    selectedBy,
    startNavigation,
    type NavigationAction,
} from '@/features/edition/editor/workspace/navigation';
import type { StartRequest } from '@/features/edition/editor/workspace/start-request';

export const useWorkspaceNavigation = (
    start: StartRequest,
    onLeaveElement: () => void,
) => {
    const [navigation, dispatch] = useReducer(
        navigationReducer,
        start,
        startNavigation,
    );
    const navigate = (action: NavigationAction): void => {
        const chosen = selectedBy(action);
        if (chosen !== undefined && chosen !== navigation.selectedKey) {
            // "Toegepast op…" belongs to the element it was said at (bug 30).
            onLeaveElement();
        }
        dispatch(action);
    };

    return { navigation, navigate };
};
