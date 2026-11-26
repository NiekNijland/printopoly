import { baselineOf, differsFromBaseline } from '@/lib/render/edition-baseline';
import { parseKey } from '@/lib/render/edition-keys';
import type { Edition, EditionSummary } from '@/lib/render/edition-types';
import { EDITOR_TABS, tabKeys } from '@/lib/render/editor-catalogue';

/**
 * What "Mijn edities" says about an edition. "Aangepast" counts against the template the edition started from
 * (B152, bug 25 ronde 3), like the editor does: a fresh template edition has changed nothing yet.
 */
export const summarizeEdition = (edition: Edition): EditionSummary => {
    const keys = [
        ...new Set([
            ...Object.keys(edition.elements),
            ...Object.keys(baselineOf(edition).elements),
        ]),
    ].filter((key) => differsFromBaseline(edition, key));
    // Everything the editor lists, plus anything changed that it does not list: the share that is your own.
    const all = new Set([
        ...EDITOR_TABS.flatMap((tab) => tabKeys(tab, edition.elements)),
        ...keys,
    ]);
    const share = keys.length === 0 ? 0 : (keys.length / all.size) * 100;

    return {
        id: edition.id,
        name: edition.name,
        language: edition.language,
        theme: edition.theme,
        revision: edition.revision,
        updatedAt: edition.updatedAt,
        createdAt: edition.createdAt,
        customizedSpaces: keys.filter((key) => parseKey(key)?.kind === 'space')
            .length,
        customizedElements: keys.length,
        // Never 0 % with a change made, never 100 % unless everything is.
        customizedPercent:
            share === 0
                ? 0
                : Math.min(
                      keys.length === all.size ? 100 : 99,
                      Math.max(1, Math.round(share)),
                  ),
    };
};
