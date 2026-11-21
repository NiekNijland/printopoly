import { describe, expect, it } from 'vitest';

import type { PrintPart } from '@/types/generated';

import { DEFAULT_BOARD_PROFILE } from './board';
import type { PrintEdition } from './composition';
import {
    describeEstimate,
    panelSize,
    partQuantity,
    setEstimate,
} from './estimate';

const edition: PrintEdition = { elements: {} };
const parts: PrintPart[] = ['board', 'cards', 'money', 'tokens', 'box_lid'];

/** A stand-in for the translations: the key and the numbers, so the test reads the structure. */
const t = (key: string, r: Record<string, string | number> = {}) =>
    key === 'print.estimate.and'
        ? '&'
        : `${key}(${Object.entries(r)
              .map(([k, v]) => `${k}=${String(v)}`)
              .join(',')})`;
const tc = (
    key: string,
    count: number,
    r: Record<string, string | number> = {},
) =>
    `${String(count)} ${key.replace('print.qty.', '')}${r['paper'] === undefined ? '' : ` ${String(r['paper'])}`}`;

describe('the print estimate (UX 3 of test round 3)', () => {
    it('counts sheets at home from the same page plan as the PDF', () => {
        const quantities = parts.map((part) => ({
            part,
            quantity: partQuantity(part, 'home', edition),
        }));

        expect(quantities.map(({ quantity }) => quantity.count)).toEqual([
            7, 8, 24, 1, 1,
        ]);
        expect(describeEstimate(setEstimate(quantities, 1), 1, t, tc)).toBe(
            'print.estimate.one(list=40 sheet A4 & 1 sheet A3print.estimate.money(count=24))',
        );
    });

    it('puts what the print shop sells per piece first and only names the money share on shared paper', () => {
        const quantities = parts.map((part) => ({
            part,
            quantity: partQuantity(part, 'printer', edition),
        }));

        expect(describeEstimate(setEstimate(quantities, 2), 2, t, tc)).toBe(
            'print.estimate.many(copies=2,list=8 panel, 120 card, 2 sheet A4, 44 sheet SRA3 & 2 piece)',
        );
    });

    it('reads the panel size from the board profile (bug 22 of test round 3)', () => {
        expect(panelSize(DEFAULT_BOARD_PROFILE)).toEqual({
            w: 248,
            h: 248,
            count: 4,
        });
        expect(
            panelSize({ ...DEFAULT_BOARD_PROFILE, outer: 485, panels: 2 }),
        ).toEqual({ w: 240.5, h: 483, count: 2 });
    });
});
