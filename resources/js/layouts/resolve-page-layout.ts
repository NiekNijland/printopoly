import PublicLayout from '@/layouts/public-layout';

/**
 * The default layout per page. Editor pages render EditorLayout themselves,
 * because its header needs the edition from the page props. The page friends
 * open from a "Samen maken" link (B123) has its own small header, without the
 * menu of the site.
 */
export const resolvePageLayout = (name: string): typeof PublicLayout | null => {
    if (name.startsWith('editor/') || name.startsWith('boxes/')) {
        return null;
    }

    return PublicLayout;
};
