// The one door to the clock and to chance: a test moves the time with vi.useFakeTimers (the set-up fakes Date for every test).

/** The time now, in milliseconds since 1970. */
export const now = (): number => Date.now();

/** A new random id (a UUID). */
export const randomId = (): string => crypto.randomUUID();
