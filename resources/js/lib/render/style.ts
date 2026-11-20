import type { ResolvedEdition } from '@/lib/edition/resolve';
import type { GroupId } from '@/lib/game/types';

import type { Theme } from './themes';

/**
 * What an edition changes on top of its theme: an accent and colours per street group (B130). Passed to the renderers as one optional prop, so a renderer that is drawn
 * without it looks exactly like the theme.
 */
export interface RenderStyle {
    accent?: string;
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
        ...(resolved.accent === undefined ? {} : { accent: resolved.accent }),
        ...(Object.keys(groupColors).length === 0 ? {} : { groupColors }),
    };

    return Object.keys(style).length === 0 ? undefined : style;
}

/** The theme with the accent of the edition: it takes the place of both accents of the theme. */
export function withAccent(theme: Theme, accent: string | undefined): Theme {
    return accent === undefined
        ? theme
        : { ...theme, accent, secondaryAccent: accent };
}
