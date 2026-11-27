import { spaceOfKey } from '@/lib/render/editor-panel-sections';
import { photo } from '@/testing/edition-test-utils';
import { sampleEdition } from '@/testing/editions';

import { sectionSummary } from './section-summary';

const t = (key: string, replacements?: Record<string, string | number>) =>
    replacements === undefined ? key : `${key} ${JSON.stringify(replacements)}`;

const summary = (
    id: 'text' | 'image' | 'amounts' | 'style',
    editKey: string,
    elements: ReturnType<typeof sampleEdition>['elements'] = {},
    kind: 'space' | 'card' | 'boardCenter' = 'space',
) =>
    sectionSummary(
        id,
        {
            edition: { ...sampleEdition(), elements },
            editKey,
            kind,
            space: spaceOfKey(editKey),
        },
        t,
    );

describe('sectionSummary', () => {
    it('says what the picture of a closed Afbeelding is', () => {
        expect(summary('image', 'space.01')).toBe('editor.summary_no_photo');
        expect(
            summary('image', 'space.01', { 'space.01': { photo: photo() } }),
        ).toBe('editor.summary_photo');
        expect(
            summary('image', 'space.01', {
                'space.01': { photo: photo(), photoStyle: 'full' },
            }),
        ).toBe('editor.summary_photo_full');
        expect(
            summary('image', 'space.05', {
                'space.05': { icon: { preset: 'gift' } },
            }),
        ).toBe('editor.summary_icon');
        expect(
            summary(
                'image',
                'board_center',
                { board_center: { centerMode: 'logo' } },
                'boardCenter',
            ),
        ).toBe('editor.center_mode_logo');
    });

    it('counts the changed amounts of a space and of a card', () => {
        expect(summary('amounts', 'space.01')).toBeUndefined();
        expect(
            summary('amounts', 'space.01', {
                'space.01': { amounts: { price: 70, rent0: 3 } },
            }),
        ).toBe('editor.summary_changed {"count":2}');
        expect(
            summary(
                'amounts',
                'card.chance.03',
                { 'card.chance.03': { amount: -40 } },
                'card',
            ),
        ).toBe('editor.summary_changed {"count":1}');
    });

    it('has no summary for the other sections', () => {
        expect(summary('text', 'space.01')).toBeUndefined();
        expect(summary('style', 'space.01')).toBeUndefined();
    });
});
