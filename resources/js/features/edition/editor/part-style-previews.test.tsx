import { resolveEdition } from '@/lib/render/edition-resolve';
import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { PART_STYLE_PREVIEWS } from './part-style-previews';

describe('PART_STYLE_PREVIEWS', () => {
    it('draws a small real render for every part with styles', () => {
        const resolved = resolveEdition(
            sampleEdition({
                parts: { money: true, pawns: true, boxLid: true },
            }),
        );
        const parts = Object.entries(PART_STYLE_PREVIEWS);

        expect(parts.map(([part]) => part).sort()).toEqual(
            ['board', 'boxLid', 'cards', 'deeds', 'money', 'pawns'].sort(),
        );
        for (const [part, Preview] of parts) {
            const { container, unmount } = renderWithI18n(
                <Preview resolved={resolved} style={undefined} />,
            );

            expect(
                container.querySelector('svg, div'),
                `the preview of ${part}`,
            ).not.toBeNull();
            unmount();
        }
    });
});
