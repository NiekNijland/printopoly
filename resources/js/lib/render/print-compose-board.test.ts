import { DEFAULT_BOARD_PROFILE } from './print-board';
import { boardPages } from './print-compose-board';
import { BLEED } from './print-page-frame';

describe('boardPages', () => {
    it('gives the print shop panels, or one whole board with bleed (B243)', () => {
        const panels = boardPages('printer', false, DEFAULT_BOARD_PROFILE);
        expect(panels.length).toBeGreaterThan(1);
        expect(panels.every((p) => p.items[0]?.kind === 'panel')).toBe(true);

        const [whole] = boardPages('printer', true, DEFAULT_BOARD_PROFILE);
        expect(whole?.size.w).toBe(DEFAULT_BOARD_PROFILE.outer + 2 * BLEED);
        expect(whole?.items[0]?.label).toBe('Bord');
    });

    it('packs the board in stickers on A4 at home', () => {
        const sheets = boardPages('home', true, DEFAULT_BOARD_PROFILE);

        expect(sheets[0]?.label).toBe('Bord 1');
        expect(sheets.flatMap((s) => s.items)).toHaveLength(44);
        expect(sheets[0]?.cropMarks.length).toBeGreaterThan(0);
    });
});
