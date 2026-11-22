import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * High contrast (bug 13 and 14, ronde 4): forced colours drop fills and shadows, which were the only sign of a
 * chosen tab or switch, and they wash out the board. The stylesheet must give the chosen state the system
 * highlight and let the printed parts keep their colours.
 */
describe('forced colours', () => {
    const block = async (): Promise<string> => {
        const css = await readFile(
            resolve(__dirname, '../../css/app.css'),
            'utf8',
        );
        const start = css.indexOf('@media (forced-colors: active)');
        expect(start).toBeGreaterThan(-1);

        return css.slice(start, css.indexOf('\n}\n', start));
    };

    it('marks the chosen tab, switch and row with the system highlight', async () => {
        const rules = await block();
        for (const selector of [
            "[role='tab'][aria-selected='true']",
            "[role='radio'][aria-checked='true']",
            "[aria-current='true']",
            'label:has(> input:checked)',
        ]) {
            expect(rules).toContain(selector);
        }
        expect(rules).toContain('background-color: Highlight');
        expect(rules).toContain('color: HighlightText');
    });

    it('lets the board and the parts keep their own colours', async () => {
        expect(await block()).toMatch(
            /\[data-keep-colors\]\s*\{\s*forced-color-adjust: none;/,
        );
    });
});
