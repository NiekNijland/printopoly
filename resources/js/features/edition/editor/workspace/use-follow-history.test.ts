import { renderHook } from '@testing-library/react';

import type { SessionEvent } from '@/features/edition/session';
import { memorySession } from '@/features/edition/testing/session';
import { sampleEdition } from '@/testing/editions';

import { historyStep, useFollowHistory } from './use-follow-history';

const t = (key: string, replacements: Record<string, string | number> = {}) =>
    `${key}${JSON.stringify(replacements)}`;

describe('historyStep', () => {
    it('goes to the element and names its field', () => {
        const step = historyStep(
            [{ key: 'space.01', before: { name: 'Opel' }, after: undefined }],
            'undo',
            sampleEdition(),
            'nl',
            t,
        );

        expect(step.action).toEqual({
            type: 'go-to',
            key: 'space.01',
            deed: false,
        });
        expect(step.text).toContain('editor.history_undone');
        expect(step.text).toContain('editor.history_field_name');
    });

    it('opens the section of a group colour and names the group', () => {
        const step = historyStep(
            [
                {
                    key: 'group.brown',
                    before: undefined,
                    after: { color: '#884422' },
                },
            ],
            'redo',
            sampleEdition(),
            'nl',
            t,
        );

        expect(step.action).toEqual({ type: 'open-edition', section: 'look' });
        expect(step.text).toContain('editor.history_redone');
    });

    it('counts names and other changes over several elements', () => {
        const names = historyStep(
            [
                { key: 'space.03', before: undefined, after: { name: 'B' } },
                { key: 'space.01', before: undefined, after: { name: 'A' } },
            ],
            'undo',
            sampleEdition(),
            'nl',
            t,
        );
        const many = historyStep(
            [
                { key: 'space.03', before: undefined, after: { name: 'B' } },
                { key: 'space.01', before: undefined, after: { text: 'A' } },
            ],
            'undo',
            sampleEdition(),
            'nl',
            t,
        );

        expect(names.text).toContain('editor.history_names');
        expect(many.text).toContain('editor.history_many');
    });

    it('names an element without a noted field by itself', () => {
        const step = historyStep(
            [
                {
                    key: 'space.01',
                    before: undefined,
                    after: { photoAspect: 1.5 },
                },
            ],
            'undo',
            sampleEdition(),
            'nl',
            t,
        );

        expect(step.text).not.toContain('editor.history_field');
    });
});

describe('useFollowHistory', () => {
    it('hands each event of the session to the latest handler', () => {
        const session = memorySession(sampleEdition());
        const first = vi.fn<(event: SessionEvent) => void>();
        const second = vi.fn<(event: SessionEvent) => void>();
        const { rerender, unmount } = renderHook(
            ({ follow }) => useFollowHistory(session, follow),
            { initialProps: { follow: first } },
        );

        rerender({ follow: second });
        session.apply([
            { key: 'space.01', before: undefined, after: { name: 'Kerkpad' } },
        ]);
        session.undo();

        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'history', direction: 'undo' }),
        );
        unmount();
    });
});
