import { loadFullPage } from './full-page-navigation';

describe('full page navigation', () => {
    it('loads the address as a new page', () => {
        const assign = vi.fn<(url: string | URL) => void>();
        vi.stubGlobal('location', { ...window.location, assign });

        loadFullPage('https://accounts.example.test/login');

        expect(assign).toHaveBeenCalledWith(
            'https://accounts.example.test/login',
        );
    });
});
