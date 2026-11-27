import { parseKey, spaceKey } from '@/lib/render/edition-keys';
import {
    EDITION_SECTIONS,
    type EditionSection,
} from '@/lib/render/editor-edition-panel';
import { deedsFor } from '@/lib/render/standard-edition';

/** Where an element shows: a title deed on its space, with the switch on Eigendomsbewijs. */
export const shownFor = (key: string): { key: string; deed: boolean } => {
    if (parseKey(key)?.kind !== 'deed') {
        return { key, deed: false };
    }
    const space = deedsFor()[Number(key.slice('deed.'.length)) - 1];

    return space === undefined
        ? { key: 'space.01', deed: false }
        : { key: spaceKey(space.position), deed: true };
};

/** What the address asks the editor to show at first; the parameters come off it, so a reload is plain. */
export type StartRequest = {
    /** `?check=1`: the open messages (B197). */
    messages: boolean;
    /** `?element=card.chance.03&field=photo`: an element and its field, from "Nog even nakijken" (B197). */
    element?: { key: string; field: string };
    /** `?edition=words`: the edition panel at a section (vindbaarheid point 4). */
    section?: EditionSection;
    /** `?edition=general&field=edition.name`: and the field to put the focus in, after Dupliceren (point 6). */
    sectionField?: string;
};

export const readStartRequest = (): StartRequest => {
    if (typeof window === 'undefined') {
        return { messages: false };
    }
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const key = params.get('element');
    const section = EDITION_SECTIONS.find(
        (candidate) => candidate === params.get('edition'),
    );
    const request: StartRequest = {
        messages: params.get('check') === '1',
        element:
            key !== null && parseKey(key) !== null
                ? { key, field: params.get('field') ?? '' }
                : undefined,
        section,
        sectionField:
            section !== undefined && key === null
                ? (params.get('field') ?? undefined)
                : undefined,
    };
    if (
        ['check', 'element', 'field', 'edition'].some((name) =>
            params.has(name),
        )
    ) {
        for (const name of ['check', 'element', 'field', 'edition']) {
            params.delete(name);
        }
        window.history.replaceState(window.history.state, '', url.toString());
    }

    return request;
};
