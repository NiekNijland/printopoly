import { standardEdition } from '@/lib/render/standard-edition';
import type { Theme } from '@/lib/render/themes';
import type { GroupId } from '@/types/game';

import { vintagePaper } from './piece-styles';
import { useRender } from './sheet';

/** The street colours of the edition: its own colours, else the theme's (B256). */
export const useStreetColors = (): string[] => {
    const { theme, style } = useRender();
    const colour = (id: GroupId, standard: string): string =>
        style?.groupColors?.[id] ?? theme.groupColors?.[id] ?? standard;

    return standardEdition.groups.map((group) => colour(group.id, group.color));
};

/** The colour of a Vintage lid: the lid colour of the theme, warmed to cream. */
export const vintageLid = (theme: Theme): string => {
    return vintagePaper(theme.boardBackground, 0.55);
};
