import { clearsSomething } from './image-choice';

describe('clearsSomething', () => {
    it('says whether an empty patch takes away a value the element has', () => {
        expect(clearsSomething(undefined, { photo: undefined })).toBe(false);
        expect(clearsSomething({ name: 'Kerkpad' }, { photo: undefined })).toBe(
            false,
        );
        expect(
            clearsSomething(
                { name: 'Kerkpad', pattern: 'dots' },
                { photo: undefined, pattern: undefined },
            ),
        ).toBe(true);
        expect(
            clearsSomething({ pattern: undefined }, { pattern: undefined }),
        ).toBe(false);
    });
});
