import {
    array,
    boolean,
    dictionary,
    is,
    keyOf,
    literal,
    nullable,
    number,
    object,
    oneOf,
    optional,
    record,
    string,
    union,
    type Parser,
} from '@/lib/parse';
import type { Elements } from '@/lib/render/edition-types';
import type { BoardProfile } from '@/lib/render/print-board';
import type { PrintEdition, PrintPart } from '@/lib/render/print-composition';

import type { PrintPayload } from './print-document';
import type { SharePayload } from './share-image';

const PRINT_PARTS: Readonly<Record<PrintPart, true>> = {
    board: true,
    cards: true,
    money: true,
    tokens: true,
    box_lid: true,
    rules_booklet: true,
    invitation: true,
    calibration: true,
};

const boardProfile: Parser<BoardProfile> = record({
    id: string,
    name: string,
    outer: number,
    corner: number,
    border: number,
    panels: oneOf([2, 4]),
    boxLid: record({ w: number, h: number }),
    provisional: optional(boolean),
});

// docs/decisions/0011-typepredicaten.md: the overrides come as PHP wrote them, so only their object is checked.
const isServerElements = (value: unknown): value is Elements =>
    is(object, value);

const elements: Parser<Elements> = (input) =>
    isServerElements(input)
        ? { ok: true, value: input }
        : { ok: false, error: 'elements: expected an object' };

const printEdition: Parser<PrintEdition> = record({
    name: optional(string),
    language: optional(string),
    theme: optional(string),
    currency: optional(string),
    boardProfile: optional(nullable(boardProfile)),
    parts: optional(dictionary(boolean)),
    moneyAmount: optional(nullable(string)),
    sets: optional(number),
    boardForm: optional(nullable(oneOf(['panels', 'whole']))),
    invitations: optional(number),
    elements,
});

const sharePayload: Parser<SharePayload> = record({
    part: literal('share'),
    set: literal('printer'),
    pageShaveMm: number,
    assetBase: optional(string),
    labels: record({ kicker: string, footer: string }),
    edition: printEdition,
    photos: optional(
        array(
            record({ id: string, src: string, width: number, height: number }),
        ),
    ),
});

const printPayload: Parser<PrintPayload> = record({
    part: keyOf(PRINT_PARTS),
    set: oneOf(['printer', 'home']),
    pageShaveMm: number,
    assetBase: optional(string),
    edition: printEdition,
});

export const pagePayload = union<PrintPayload | SharePayload>(
    sharePayload,
    printPayload,
);
