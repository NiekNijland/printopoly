import { paperSize } from './photo-paper-size';

const t = (key: string, replacements?: Record<string, string | number>) =>
    replacements === undefined ? key : `${key} ${JSON.stringify(replacements)}`;

describe('paperSize', () => {
    it('names what a framed photo is printed on, and the whole element as the way to a larger one', () => {
        expect(
            paperSize(t, 'box_lid', false, { w: 40.4, h: 30.6 }, 211.6),
        ).toBe(
            `editor.photo_paper_size_framed ${JSON.stringify({
                where: 'editor.photo_on_boxLid',
                w: 40,
                h: 31,
                ppi: 212,
                full: 'editor.photo_style_full_boxLid',
            })}`,
        );
    });

    it('drops the advice on a photo over the whole element and on a large photo', () => {
        expect(paperSize(t, 'pawn.01', true, { w: 20, h: 30 }, 300)).toContain(
            'editor.photo_paper_size {',
        );
        expect(
            paperSize(t, 'space.01', false, { w: 60, h: 80 }, 300),
        ).toContain('editor.photo_paper_size_large {');
    });

    it('says the board for a kind without a word of its own', () => {
        expect(
            paperSize(t, 'board_center', true, { w: 20, h: 30 }, 300),
        ).toContain('"where":"editor.photo_on_space"');
    });
});
