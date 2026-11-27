import { now, randomId } from './clock';

describe('clock', () => {
    it('reads the time the fake clock sets', () => {
        vi.setSystemTime(new Date('2026-11-20T12:00:00Z'));

        expect(now() - Date.UTC(2026, 10, 20, 12)).toBeGreaterThanOrEqual(0);
        expect(now() - Date.UTC(2026, 10, 20, 12)).toBeLessThan(1000);
    });

    it('gives a new UUID on every call', () => {
        const first = randomId();

        expect(first).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
        expect(randomId()).not.toBe(first);
    });
});
