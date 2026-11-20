import type { ThemeId } from './themes';

export interface Swatch {
    hex: string;
    name: { nl: string; en: string };
}

/**
 * A curated palette per theme, for group colours and the accent. All of them stay inside the
 * CMYK range (B75): flat tints of the print colours, nothing neon.
 */
export const PALETTES: Readonly<Record<ThemeId, readonly Swatch[]>> = {
    classic: [
        { hex: '#955436', name: { nl: 'Bruin', en: 'Brown' } },
        { hex: '#AAE0FA', name: { nl: 'Lichtblauw', en: 'Light blue' } },
        { hex: '#D93A96', name: { nl: 'Roze', en: 'Pink' } },
        { hex: '#F7941D', name: { nl: 'Oranje', en: 'Orange' } },
        { hex: '#ED1B24', name: { nl: 'Rood', en: 'Red' } },
        { hex: '#FEF200', name: { nl: 'Geel', en: 'Yellow' } },
        { hex: '#1FB25A', name: { nl: 'Groen', en: 'Green' } },
        { hex: '#0072BB', name: { nl: 'Donkerblauw', en: 'Dark blue' } },
        { hex: '#7B4B94', name: { nl: 'Paars', en: 'Purple' } },
        { hex: '#00857C', name: { nl: 'Blauwgroen', en: 'Teal' } },
        { hex: '#C8321F', name: { nl: 'Drukkersrood', en: 'Printer red' } },
        { hex: '#1B1F24', name: { nl: 'Inkt', en: 'Ink' } },
    ],
    riso: [
        { hex: '#E6007E', name: { nl: 'Magenta', en: 'Magenta' } },
        { hex: '#00A3E0', name: { nl: 'Cyaan', en: 'Cyan' } },
        { hex: '#FFD500', name: { nl: 'Geel', en: 'Yellow' } },
        { hex: '#FF6C2F', name: { nl: 'Oranje', en: 'Orange' } },
        { hex: '#FF665E', name: { nl: 'Koraal', en: 'Coral' } },
        { hex: '#765BA7', name: { nl: 'Paars', en: 'Purple' } },
        { hex: '#0078BF', name: { nl: 'Blauw', en: 'Blue' } },
        { hex: '#00A95C', name: { nl: 'Groen', en: 'Green' } },
        { hex: '#62A8E5', name: { nl: 'Lucht', en: 'Sky' } },
        { hex: '#FFB511', name: { nl: 'Goud', en: 'Gold' } },
        { hex: '#B5342A', name: { nl: 'Baksteen', en: 'Brick' } },
        { hex: '#1B1F24', name: { nl: 'Inkt', en: 'Ink' } },
    ],
    strak: [
        { hex: '#1B1F24', name: { nl: 'Inkt', en: 'Ink' } },
        { hex: '#4A4F57', name: { nl: 'Leisteen', en: 'Slate' } },
        { hex: '#8A8F98', name: { nl: 'Grijs', en: 'Grey' } },
        { hex: '#6B4A3A', name: { nl: 'Bruin', en: 'Brown' } },
        { hex: '#5B7C99', name: { nl: 'Staalblauw', en: 'Steel blue' } },
        { hex: '#2F5D8A', name: { nl: 'Marine', en: 'Navy' } },
        { hex: '#3E7D5A', name: { nl: 'Dennengroen', en: 'Pine' } },
        { hex: '#A8452F', name: { nl: 'Roest', en: 'Rust' } },
        { hex: '#B8892B', name: { nl: 'Oker', en: 'Ochre' } },
        { hex: '#8C5A7A', name: { nl: 'Pruim', en: 'Plum' } },
        { hex: '#C9A9A6', name: { nl: 'Oudroze', en: 'Dusty rose' } },
        { hex: '#A9C3D6', name: { nl: 'Mist', en: 'Mist' } },
    ],
};
