import type { SectionRequest } from '@/features/edition/editor/edition-panel';
import {
    shownFor,
    type StartRequest,
} from '@/features/edition/editor/workspace/start-request';
import {
    sectionOfKey,
    type EditionSection,
} from '@/lib/render/editor-edition-panel';

export type FocusRequest = { n: number; field: string };

export type NavigationState = {
    selectedKey: string;
    deedView: boolean;
    /** The edition as an element (B145): the whole board in the middle and the edition panel on the right. */
    editionOpen: boolean;
    mobileElement: boolean;
    /** The big board to pick a space from (B144, UX 2 ronde 3); on a phone a tap on the small board opens it. */
    bigBoard: boolean;
    sectionRequest: SectionRequest | null;
    focusRequest: FocusRequest | null;
};

export type NavigationAction =
    | { type: 'select'; key: string; deed?: boolean }
    | { type: 'go-to'; key: string; deed?: boolean }
    | { type: 'leave'; key: string }
    | { type: 'pick-space'; key: string; wide: boolean }
    | { type: 'open-edition'; section: EditionSection }
    | { type: 'open-from-check'; key: string; field: string }
    | { type: 'request-focus'; field: string }
    | { type: 'deed-view'; deed: boolean }
    | { type: 'close-element' }
    | { type: 'big-board'; open: boolean };

const focusFor = (
    previous: FocusRequest | null,
    field: string,
): FocusRequest => ({ n: (previous?.n ?? 0) + 1, field });

export const startNavigation = (start: StartRequest): NavigationState => {
    const { element, sectionField } = start;
    const shown =
        element !== undefined && sectionOfKey(element.key) === null
            ? shownFor(element.key)
            : { key: 'space.01', deed: false };
    const section =
        start.section ??
        (element === undefined
            ? undefined
            : (sectionOfKey(element.key) ?? undefined));
    const field =
        element === undefined
            ? sectionField
            : sectionOfKey(element.key) !== null
              ? `${element.key}.${element.field}`
              : element.field.startsWith('layer')
                ? 'photo'
                : element.field;

    return {
        selectedKey: shown.key,
        deedView: shown.deed,
        editionOpen: section !== undefined,
        mobileElement: element !== undefined || section !== undefined,
        bigBoard: false,
        sectionRequest: section === undefined ? null : { section, n: 1 },
        focusRequest: field === undefined ? null : { n: 1, field },
    };
};

const select = (
    state: NavigationState,
    key: string,
    deed = false,
): NavigationState => ({
    ...state,
    selectedKey: key,
    deedView: deed,
    editionOpen: false,
    bigBoard: false,
    mobileElement: true,
});

const openEdition = (
    state: NavigationState,
    section: EditionSection,
): NavigationState => ({
    ...state,
    editionOpen: true,
    mobileElement: true,
    sectionRequest: { section, n: (state.sectionRequest?.n ?? 0) + 1 },
});

const openFromCheck = (
    state: NavigationState,
    key: string,
    field: string,
): NavigationState => {
    const section = sectionOfKey(key);
    if (section !== null) {
        return {
            ...openEdition(state, section),
            focusRequest: focusFor(state.focusRequest, `${key}.${field}`),
        };
    }
    const shown = shownFor(key);

    return {
        ...select(state, shown.key, shown.deed),
        focusRequest: focusFor(
            state.focusRequest,
            field.startsWith('layer') ? 'photo' : field,
        ),
    };
};

export const navigationReducer = (
    state: NavigationState,
    action: NavigationAction,
): NavigationState => {
    switch (action.type) {
        case 'select':
            return select(state, action.key, action.deed);
        case 'go-to':
            return {
                ...state,
                selectedKey: action.key,
                deedView: action.deed ?? false,
                editionOpen: false,
            };
        case 'leave':
            return { ...state, selectedKey: action.key, deedView: false };
        case 'pick-space':
            // A space picked on the board: on a phone it opens, like a row of the list; on a desktop it shows.
            return action.wide
                ? {
                      ...state,
                      selectedKey: action.key,
                      deedView: false,
                      editionOpen: false,
                      bigBoard: false,
                  }
                : select(state, action.key);
        case 'open-edition':
            return openEdition(state, action.section);
        case 'open-from-check':
            return openFromCheck(state, action.key, action.field);
        case 'request-focus':
            return {
                ...state,
                focusRequest: focusFor(state.focusRequest, action.field),
            };
        case 'deed-view':
            return { ...state, deedView: action.deed };
        case 'close-element':
            return { ...state, mobileElement: false };
        case 'big-board':
            return { ...state, bigBoard: action.open };
    }
};

export const selectedBy = (action: NavigationAction): string | undefined => {
    if (action.type === 'select') {
        return action.key;
    }
    if (action.type === 'pick-space') {
        return action.wide ? undefined : action.key;
    }
    if (action.type === 'open-from-check') {
        return sectionOfKey(action.key) === null
            ? shownFor(action.key).key
            : undefined;
    }

    return undefined;
};
