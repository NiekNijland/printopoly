/** CSS length in millimetres, without floating point noise. */
export function mm(value: number): string {
    return `${Math.round(value * 1000) / 1000}mm`;
}
