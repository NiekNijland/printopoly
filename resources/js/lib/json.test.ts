import { parseJson } from './json';

describe('json', () => {
    it('parses JSON and reads broken text as undefined', () => {
        expect(parseJson('{"a":1}')).toEqual({ a: 1 });
        expect(parseJson('not json')).toBeUndefined();
    });
});
