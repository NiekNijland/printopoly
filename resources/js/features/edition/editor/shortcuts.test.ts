import {
    actionForKey,
    shortcutProps,
} from '@/features/edition/editor/shortcuts';

const base = {
    key: '',
    code: '',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
};
const on = { plain: true, typing: false, interactive: false };

const press = (
    init: Partial<typeof base>,
    options: Partial<typeof on> = {},
): ReturnType<typeof actionForKey> => {
    return actionForKey({ ...base, ...init }, { ...on, ...options });
};

describe('actionForKey', () => {
    it('maps the single keys', () => {
        expect(press({ key: 'j' })).toEqual({ type: 'next' });
        expect(press({ key: ']' })).toEqual({ type: 'next' });
        expect(press({ key: 'k' })).toEqual({ type: 'previous' });
        expect(press({ key: 'C' })).toEqual({ type: 'check' });
        expect(press({ key: 'p' })).toEqual({ type: 'photo' });
        expect(press({ key: 'r' })).toEqual({ type: 'rotate' });
        expect(press({ key: 'b' })).toEqual({ type: 'grayscale' });
        expect(press({ key: 'e' })).toEqual({ type: 'edition' });
        expect(press({ key: '+', shiftKey: true })).toEqual({ type: 'zoomIn' });
        expect(press({ key: '-' })).toEqual({ type: 'zoomOut' });
        expect(press({ key: '3' })).toEqual({ type: 'tab', index: 2 });
        expect(press({ key: '?', shiftKey: true })).toEqual({ type: 'help' });
        expect(press({ key: 'F2' })).toEqual({ type: 'focusName' });
        expect(press({ key: 'Enter' })).toEqual({ type: 'focusName' });
    });

    it('maps Alt+digit by code, since Alt changes the key on a Mac', () => {
        expect(press({ key: '¡', code: 'Digit1', altKey: true })).toEqual({
            type: 'tab',
            index: 0,
        });
    });

    it('maps Ctrl and Cmd with S and P, also while typing', () => {
        expect(press({ key: 's', ctrlKey: true }, { typing: true })).toEqual({
            type: 'save',
        });
        expect(press({ key: 'p', metaKey: true }, { typing: true })).toEqual({
            type: 'print',
        });
    });

    it('does nothing while typing', () => {
        for (const key of ['j', 'k', 'c', 'r', '?', 'F2', 'Enter', '2']) {
            expect(press({ key }, { typing: true })).toBeNull();
        }
    });

    it('leaves Enter to a focused button or link', () => {
        expect(press({ key: 'Enter' }, { interactive: true })).toBeNull();
    });

    it('turns the single letters off but keeps the rest', () => {
        const off = { plain: false };
        expect(press({ key: 'j' }, off)).toBeNull();
        expect(press({ key: '1' }, off)).toBeNull();
        expect(press({ key: '?', shiftKey: true }, off)).toEqual({
            type: 'help',
        });
        expect(press({ key: 'F2' }, off)).toEqual({ type: 'focusName' });
        expect(press({ key: 's', ctrlKey: true }, off)).toEqual({
            type: 'save',
        });
    });

    it('does not take browser combinations', () => {
        expect(press({ key: 'r', ctrlKey: true })).toBeNull();
        expect(press({ key: 'c', metaKey: true })).toBeNull();
        expect(press({ key: 'j', altKey: true })).toBeNull();
        expect(press({ key: 'J', shiftKey: true })).toBeNull();
    });
});

describe('shortcutProps', () => {
    it('adds the shortcut to the title and sets aria-keyshortcuts', () => {
        expect(shortcutProps('rotate', 'Draaien')).toEqual({
            title: 'Draaien (R)',
            'aria-keyshortcuts': 'R',
        });
    });
});
