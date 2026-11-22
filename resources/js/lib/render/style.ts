import type { ResolvedEdition } from '@/lib/edition/resolve';
import type { GroupId } from '@/lib/game/types';

/**
 * What an edition changes on top of its theme: colours per street group (B130); the theme sets the accents (B203).
 * Passed to the renderers as one optional prop, so a renderer that is drawn
 * without it looks exactly like the theme.
 */
export interface RenderStyle {
    groupColors?: Partial<Record<GroupId, string>>;
}

/** The style of a resolved edition, or `undefined` when it changes nothing. */
export function buildStyle(resolved: ResolvedEdition): RenderStyle | undefined {
    const groupColors: Partial<Record<GroupId, string>> = {};

    for (const group of resolved.groups) {
        if (group.customized && group.color !== undefined) {
            groupColors[group.id] = group.color;
        }
    }

    const style: RenderStyle = {
        ...(Object.keys(groupColors).length === 0 ? {} : { groupColors }),
    };

    return Object.keys(style).length === 0 ? undefined : style;
}
