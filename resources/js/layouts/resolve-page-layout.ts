import PublicLayout from '@/layouts/public-layout';

/**
 * The default layout per page. Editor pages render EditorLayout themselves,
 * because its header needs the edition from the page props.
 */
export function resolvePageLayout(name: string): typeof PublicLayout | null {
    if (name.startsWith('editor/')) {
        return null;
    }

    return PublicLayout;
}
