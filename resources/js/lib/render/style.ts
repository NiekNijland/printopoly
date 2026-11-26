import type {
    PartStyleIds,
    PartStyles,
    StyledPart,
} from '@/lib/render/edition-part-styles';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import type { GroupId } from '@/types/game';

/**
 * What an edition changes on top of its theme: colours per street group (B130); the theme sets the accents (B203).
 * Passed to the renderers as one optional prop, so a renderer that is drawn
 * without it looks exactly like the theme.
 */
export interface RenderStyle {
    groupColors?: Partial<Record<GroupId, string>>;
    /**
     * The style of each part that has one of its own (B268); a part that is absent is drawn as its theme. A renderer
     * reads its own with `partStyleOf(useRender().style, 'board')`.
     */
    parts?: PartStyles;
}

/** The own style of one part, or `undefined` when it follows the theme (B268). */
export function partStyleOf<P extends StyledPart>(
    style: RenderStyle | undefined,
    part: P,
): PartStyleIds[P] | undefined {
    return style?.parts?.[part];
}

/** The style of a resolved edition, or `undefined` when it changes nothing. */
export function buildStyle(resolved: ResolvedEdition): RenderStyle | undefined {
    const groupColors: Partial<Record<GroupId, string>> = {};

    for (const group of resolved.groups) {
        if (group.customized && group.color !== undefined) {
            groupColors[group.id] = group.color;
        }
    }

    const parts = resolved.partStyles;
    const style: RenderStyle = {
        ...(Object.keys(groupColors).length === 0 ? {} : { groupColors }),
        ...(Object.keys(parts).length === 0 ? {} : { parts }),
    };

    return Object.keys(style).length === 0 ? undefined : style;
}
