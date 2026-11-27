/** CSS length in millimetres, without floating point noise. */
export const mm = (value: number): string => {
    return `${Math.round(value * 1000) / 1000}mm`;
};
