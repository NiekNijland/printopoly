import type { LucideIcon } from 'lucide-react';

import { HOME_ICONS } from './lucide-space-icons-home';
import { LEISURE_ICONS } from './lucide-space-icons-leisure';
import { TOWN_ICONS } from './lucide-space-icons-town';

/**
 * The lucide drawings a special space can show (B196), by preset id. Generated together with
 * lucide-space-icons.json, which holds their names and categories and which the server reads to validate an
 * edition; a test keeps the two the same.
 */
export const LUCIDE_SPACE_ICONS: Readonly<Record<string, LucideIcon>> = {
    ...TOWN_ICONS,
    ...HOME_ICONS,
    ...LEISURE_ICONS,
};
