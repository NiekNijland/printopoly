import PublicLayout from '@/layouts/public-layout';
import { resolvePageLayout } from '@/layouts/resolve-page-layout';

describe('resolvePageLayout', () => {
    it('wraps public pages in the public layout', () => {
        expect(resolvePageLayout('home')).toBe(PublicLayout);
        expect(resolvePageLayout('placeholder')).toBe(PublicLayout);
    });

    it('leaves editor pages to render the editor layout themselves', () => {
        expect(resolvePageLayout('editor/show')).toBeNull();
    });
});
