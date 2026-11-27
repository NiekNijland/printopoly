import { DEFAULT_BOARD_PROFILE } from './print-board';
import {
    bookletHome,
    bookletPrinter,
    boxLid,
    calibration,
    invitation,
} from './print-compose-extras';

describe('print-compose-extras', () => {
    it('makes the lid one piece for the shop and A4 pieces at home (R5-29)', () => {
        expect(boxLid(DEFAULT_BOARD_PROFILE, 'printer')).toHaveLength(1);
        const home = boxLid(DEFAULT_BOARD_PROFILE, 'home');
        expect(home.length).toBeGreaterThanOrEqual(1);
        expect(home[0]?.items[0]?.elementKey).toBe('box_lid');
    });

    it('prints the booklet page by page for the shop and as folded spreads at home', () => {
        const shop = bookletPrinter();
        const home = bookletHome();

        expect(shop[0]?.items[0]?.label).toBe('Pagina 1');
        expect(home[0]?.items).toHaveLength(2);
        expect(home[0]?.foldLines).toHaveLength(2);
        expect(home.length * 2).toBe(shop.length);
    });

    it('prints one invitation for the shop and four on A4 at home', () => {
        expect(invitation('printer')[0]?.items).toHaveLength(1);
        expect(invitation('home')[0]?.items).toHaveLength(4);
    });

    it('lays out the test sheet: ruler, bank card and two spaces (B74)', () => {
        expect(
            calibration(DEFAULT_BOARD_PROFILE)[0]?.items.map((i) => i.id),
        ).toEqual(['ruler', 'bank-card', 'corner-space', 'normal-space']);
    });
});
