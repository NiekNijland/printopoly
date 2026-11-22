import type {
    CheckAmount,
    CheckColor,
    CheckElement,
    CheckInput,
    CheckNamePlace,
    CheckPhoto,
    CheckText,
} from '@/lib/checks/types';
import {
    amountField,
    amountRange,
    isCardAmountAllowed,
    isExtraCardAmountAllowed,
    MAX_EXTRA_CARD_AMOUNT,
    resolveCardAmount,
} from '@/lib/edition/amounts';
import { cardTextProblems } from '@/lib/edition/card-text';
import { withDeedPhotos } from '@/lib/edition/deed-photos';
import {
    HOUSE_RULES_KEY,
    INVITATION_KEY,
    PAWN_COUNT,
    WORD_IDS,
    isExtraCardKey,
    parseKey,
    pawnKey,
    wordKey,
} from '@/lib/edition/keys';
import { resolveEdition } from '@/lib/edition/resolve';
import type { Edition, ElementOverride } from '@/lib/edition/types';
import { resolveWords } from '@/lib/edition/words';
import { emptyNameKeys } from '@/lib/editor/clear-names';
import { cardHasText, deckCardKeys } from '@/lib/editor/extra-cards';
import { centerFoldItems, layersOverLidText } from '@/lib/editor/layers';
import { photoBleed } from '@/lib/editor/photo-bleed';
import type { PhotoInfos } from '@/lib/editor/photo-cache';
import { placementToTransform } from '@/lib/editor/photo-cache';
import { WORD_PROBES } from '@/lib/editor/word-probes';
import { formatMoney, standardEdition } from '@/lib/game/standard-edition';
import { iconTargets } from '@/lib/print/photo-targets';
import type { Size } from '@/lib/print/types';
import {
    BOOKLET_TITLE_BOX,
    NOTE_NAME_BOX,
    fitsNameBox,
} from '@/lib/render/name-boxes';
import { THEMES } from '@/lib/render/themes';

/** What the hidden probe render found for one element: the photo frame and how its texts fit. */
export interface ProbeResult {
    frame: Size | null;
    /** The area of a photo over the whole board centre (B125), when there is one. */
    background?: Size | null;
    /** Per text: whether it fits, by how much not, the letter size it got (mm) and its slot (`name`, `town`). */
    texts: {
        fits: boolean;
        overflowChars: number;
        fontMm?: number;
        slot?: string;
    }[];
}

export type Probes = ReadonlyMap<string, ProbeResult>;

/** The words the edition changed, with the elements that show them (and that are printed). */
function wordProbes(edition: Edition) {
    const custom = resolveWords(edition).custom;

    return WORD_IDS.filter((id) => custom[id]).flatMap((id) =>
        WORD_PROBES[id]
            .filter((probe) => edition.parts[probe.part])
            .map((probe) => ({ id, ...probe })),
    );
}

/**
 * Keys of the elements the probe has to draw: customised ones in parts that are on, and the elements that
 * show a custom word (a deed for a new house name, a space for a new deck name).
 */
export function probeKeys(stored: Edition): string[] {
    // A deed that shows the photo of its space is checked in its own, larger frame too (B157).
    const edition = withDeedPhotos(stored);
    const own = Object.entries(edition.elements)
        .filter(([key, override]) => {
            const parsed = parseKey(key);
            const part = parsed?.part;

            return (
                part !== undefined &&
                parsed?.kind !== 'words' &&
                edition.parts[part] &&
                (override.photo !== undefined ||
                    override.name !== undefined ||
                    override.text !== undefined ||
                    override.amount !== undefined ||
                    override.amounts !== undefined ||
                    override.purpose !== undefined ||
                    override.background !== undefined ||
                    override.layers !== undefined)
            );
        })
        .map(([key]) => key);

    return [
        ...own,
        ...new Set(
            wordProbes(edition)
                .map((probe) => probe.key)
                .filter((key) => !own.includes(key)),
        ),
    ];
}

function textField(key: string): string {
    const kind = parseKey(key)?.kind;

    return kind === 'card' || kind === 'houseRules' || kind === 'invitation'
        ? 'text'
        : 'name';
}

function standardCardOf(key: string) {
    const [, deck, index] = key.split('.');

    return deck === 'chance' || deck === 'chest'
        ? standardEdition.decks[deck][Number(index) - 1]
        : undefined;
}

/** The amount a card prints with: free on an extra card (B135), else within 20% of the standard amount. */
function cardAmountOf(
    key: string,
    override: ElementOverride,
): number | undefined {
    if (isExtraCardKey(key)) {
        return override.amount !== undefined &&
            isExtraCardAmountAllowed(override.amount)
            ? override.amount
            : undefined;
    }
    const standard = standardCardOf(key);

    return standard === undefined
        ? undefined
        : resolveCardAmount(standard, override.amount);
}

/** The amounts a card may take, as positive numbers: 20% around the standard, or up to 500 on an extra card. */
function cardRange(key: string): { min: number; max: number } {
    const standard = standardCardOf(key)?.amount;

    return isExtraCardKey(key) || standard === undefined
        ? { min: 1, max: MAX_EXTRA_CARD_AMOUNT }
        : amountRange(Math.abs(standard));
}

/** An amount as the card prints it: "€ 18". */
function shownAmount(edition: Edition, amount: number): string {
    return formatMoney(
        Math.abs(amount),
        edition.currency,
        edition.language,
        resolveWords(edition).customSymbol,
    );
}

/** B132: the amounts of one element that are outside 20% of the standard amount. */
function amountProblems(key: string, override: ElementOverride): CheckAmount[] {
    const kind = parseKey(key)?.kind;
    const problems: CheckAmount[] = [];

    if (kind === 'space' && override.amounts !== undefined) {
        const space = standardEdition.spaces[Number(key.split('.')[1])];
        for (const [id, value] of Object.entries(override.amounts)) {
            const field =
                space === undefined ? undefined : amountField(space, id);
            if (field === undefined) {
                continue;
            }
            const range = amountRange(field.standard);
            if (
                !Number.isInteger(value) ||
                value < range.min ||
                value > range.max
            ) {
                problems.push({ field: `amounts.${id}`, value, ...range });
            }
        }
    }
    if (
        kind === 'card' &&
        override.amount !== undefined &&
        isExtraCardKey(key) &&
        !isExtraCardAmountAllowed(override.amount)
    ) {
        problems.push({
            field: 'amount',
            value: override.amount,
            min: -MAX_EXTRA_CARD_AMOUNT,
            max: MAX_EXTRA_CARD_AMOUNT,
        });
    }
    if (
        kind === 'card' &&
        override.amount !== undefined &&
        !isExtraCardKey(key)
    ) {
        const card = standardCardOf(key);
        if (
            card?.amount !== undefined &&
            !isCardAmountAllowed(card, override.amount)
        ) {
            problems.push({
                field: 'amount',
                value: override.amount,
                ...amountRange(card.amount),
            });
        }
    }

    return problems;
}

/** Maps an edition and the probe results onto what the checks need (B94). */
/**
 * Pawns in the set that still lack a photo. Only once one pawn has a photo: pawns with just a name are a fine
 * set, so a fresh edition does not start with a warning per pawn (UX 9, ronde 3).
 */
function pawnsWithoutPhoto(edition: Edition): string[] {
    if (!edition.parts.pawns) {
        return [];
    }
    const shown = Array.from({ length: PAWN_COUNT }, (_, i) =>
        pawnKey(i + 1),
    ).filter((key) => edition.elements[key]?.hidden !== true);
    const without = shown.filter(
        (key) => edition.elements[key]?.photo === undefined,
    );

    return without.length < shown.length ? without : [];
}

export function buildCheckInput(
    stored: Edition,
    probes: Probes,
    photos: PhotoInfos,
): CheckInput {
    const edition = withDeedPhotos(stored, photos);
    const elements: CheckElement[] = [];

    for (const [key, override] of Object.entries(edition.elements)) {
        const probe = probes.get(key);
        if (probe === undefined) {
            continue;
        }
        const photoChecks: CheckPhoto[] = [];
        if (override.photo !== undefined && probe.frame !== null) {
            const info = photos.get(override.photo.photoId);
            if (info !== undefined) {
                photoChecks.push({
                    field: 'photo',
                    source: { w: info.width, h: info.height },
                    transform: placementToTransform(override.photo),
                    frame: probe.frame,
                    bleed: photoBleed(key, override.photoStyle),
                });
            }
        }
        if (override.background !== undefined && probe.background) {
            const info = photos.get(override.background.photoId);
            if (info !== undefined) {
                photoChecks.push({
                    field: 'background',
                    source: { w: info.width, h: info.height },
                    transform: placementToTransform(override.background),
                    frame: probe.background,
                    bleed: 0,
                });
            }
        }
        // Photos as free layers (centre, lid, card backs) print at the size of their layer.
        for (const layer of override.layers ?? []) {
            const info =
                layer.kind === 'photo'
                    ? photos.get(layer.photo.photoId)
                    : undefined;
            if (layer.kind === 'photo' && info !== undefined) {
                photoChecks.push({
                    field: `layer.${layer.id}`,
                    source: { w: info.width, h: info.height },
                    transform: placementToTransform(layer.photo),
                    frame: { w: layer.w, h: layer.h },
                    bleed: 0,
                });
            }
        }
        const field = textField(key);
        // On the board a tiny letter is a problem of its own (bug 13): names are read from across the table.
        const onBoard = parseKey(key)?.kind === 'space';
        const texts: CheckText[] = probe.texts.map((text) => ({
            field: text.slot === 'town' ? 'town' : field,
            fit: text.fits
                ? { fits: true }
                : { fits: false, excessCharacters: text.overflowChars },
            ...(onBoard && text.fontMm !== undefined
                ? { fontMm: text.fontMm }
                : {}),
        }));
        elements.push({
            key,
            ...(photoChecks.length > 0 ? { photos: photoChecks } : {}),
            ...(texts.length > 0 ? { texts } : {}),
        });
    }

    // An uploaded icon (B136) is checked at the largest size it prints at; it is drawn whole, never zoomed.
    for (const [key, frame] of Object.entries(iconTargets(edition))) {
        const icon = edition.elements[key]?.icon;
        const info =
            icon !== undefined && 'photo' in icon
                ? photos.get(icon.photo.photoId)
                : undefined;
        if (icon === undefined || !('photo' in icon) || info === undefined) {
            continue;
        }
        const check: CheckPhoto = {
            field: 'icon',
            source: { w: info.width, h: info.height },
            transform: placementToTransform(icon.photo),
            frame,
            bleed: 0,
        };
        const existing = elements.find((element) => element.key === key);
        if (existing === undefined) {
            elements.push({ key, photos: [check] });
        } else {
            existing.photos = [...(existing.photos ?? []), check];
        }
    }

    // A word that does not fit is blamed on the word, not on the card or space that shows it, unless that
    // element has a text of its own: then the text is the problem.
    const blamed = new Set<string>();
    for (const probe of wordProbes(edition)) {
        const result = probes.get(probe.key);
        const own = edition.elements[probe.key];
        const where = `${probe.id}|${probe.place.en}`;
        if (
            blamed.has(where) ||
            result === undefined ||
            own?.name !== undefined ||
            own?.text !== undefined
        ) {
            continue;
        }
        const texts = result.texts
            .filter((text) => !text.fits)
            .map((text): CheckText => ({
                field: 'name',
                place: probe.place,
                fit: { fits: false, excessCharacters: text.overflowChars },
            }));
        if (texts.length > 0) {
            blamed.add(where);
            elements.push({ key: wordKey(probe.id), texts });
        }
    }

    if (edition.parts.cards) {
        for (const [key, override] of Object.entries(edition.elements)) {
            if (parseKey(key)?.kind !== 'card' || override.text === undefined) {
                continue;
            }
            const amount = cardAmountOf(key, override);
            const cardText = cardTextProblems(override.text, edition, amount);
            if (cardText.length === 0) {
                continue;
            }
            const cardAmount =
                amount === undefined || amount === 0
                    ? undefined
                    : {
                          value: amount,
                          shown: shownAmount(edition, amount),
                          ...cardRange(key),
                      };
            const at = elements.findIndex((element) => element.key === key);
            const existing = elements[at];
            const extra = cardAmount === undefined ? {} : { cardAmount };
            if (existing === undefined) {
                elements.push({ key, cardText, ...extra });
            } else {
                elements[at] = { ...existing, cardText, ...extra };
            }
        }
    }

    for (const [key, override] of Object.entries(edition.elements)) {
        const amounts = amountProblems(key, override);
        if (amounts.length === 0) {
            continue;
        }
        const at = elements.findIndex((element) => element.key === key);
        const existing = elements[at];
        if (existing === undefined) {
            elements.push({ key, amounts });
        } else {
            elements[at] = { ...existing, amounts };
        }
    }

    const { parts } = edition;

    return {
        board: edition.boardProfile,
        parts: {
            board: parts.board,
            titleDeeds: parts.deeds,
            cards: parts.cards,
            money: parts.money,
            tokens: parts.pawns,
            boxLid: parts.boxLid,
            houseRules: parts.houseRules,
        },
        elements,
        pawnsWithoutPhoto: pawnsWithoutPhoto(edition),
        colors: colorsOf(edition),
        // An empty house rules card is left out of the set (B210), so only a card someone started and emptied
        // again (a template text cleared, or only a photo) gets a word about it.
        houseRulesEmpty:
            parts.houseRules &&
            edition.elements[HOUSE_RULES_KEY] !== undefined &&
            (edition.elements[HOUSE_RULES_KEY].text ?? '').trim() === '',
        // The invitation in the set with nothing yet about when and where prints dotted lines (R5-28).
        invitationBlank:
            parts.invitation &&
            (edition.elements[INVITATION_KEY]?.text ?? '').trim() === '',
        lidLayersOverText: parts.boxLid
            ? layersOverLidText(edition).map((layer) => layer.id)
            : [],
        longName: longNamePlaces(edition),
        centerOnFold: parts.board
            ? centerFoldItems(edition, resolveEdition(edition).boardCenter)
            : [],
        // Extra cards without a text (B135), and cards whose text was cleared (B194).
        emptyCards: parts.cards
            ? (['chance', 'chest'] as const)
                  .flatMap((deck) => deckCardKeys(edition, deck))
                  .filter((key) => !cardHasText(edition, key))
            : [],
        // Streets, stations and utilities after "Namen leegmaken" (B201).
        emptyNames: emptyNameKeys(edition),
    };
}

/**
 * The printed parts where the edition name does not fit, even wrapped at the smallest size: the title of the rules
 * booklet and the strip of the banknotes (bug 14 of test round 3). Measured with the rough measure, so only a very
 * long name or word is reported.
 */
function longNamePlaces(edition: Edition): CheckNamePlace[] {
    const places: CheckNamePlace[] = [];
    const name = edition.name.trim();

    if (name === '') {
        return places;
    }

    if (edition.parts.rulesBooklet) {
        const title = `${edition.language === 'nl' ? 'Welkom bij' : 'Welcome to'} ${name}`;
        const fit = fitsNameBox(title, BOOKLET_TITLE_BOX);

        if (!fit.fits) {
            places.push({
                elementKey: 'rules_booklet',
                place: { nl: 'het spelregelboekje', en: 'the rules booklet' },
                excessCharacters: fit.overflowChars,
            });
        }
    }

    if (edition.parts.money) {
        const fit = fitsNameBox(name, NOTE_NAME_BOX);

        if (!fit.fits) {
            places.push({
                elementKey: 'note.500',
                place: { nl: 'het speelgeld', en: 'the play money' },
                excessCharacters: fit.overflowChars,
            });
        }
    }

    return places;
}

/** The colours the edition changed, with the colour they are printed on. */
function colorsOf(edition: Edition): CheckColor[] {
    const resolved = resolveEdition(edition);
    const board = THEMES[edition.theme].boardBackground;
    const colors: CheckColor[] = [];

    for (const group of resolved.groups) {
        if (
            group.customized &&
            edition.elements[group.key]?.color !== undefined
        ) {
            colors.push({
                field: group.id,
                name: standardEdition.groups.find(
                    (candidate) => candidate.id === group.id,
                )?.name ?? { nl: group.id, en: group.id },
                hex: group.color,
                role: 'bar',
                against: board,
            });
        }
    }

    return colors;
}

/** Reads photo frames and text fits out of a rendered element (the elements mark them with data attributes). */
export function readProbe(root: HTMLElement): ProbeResult {
    const slot = root.querySelector<HTMLElement>('[data-photo]');
    const frame =
        slot === null
            ? null
            : {
                  w: parseFloat(slot.style.width),
                  h: parseFloat(slot.style.height),
              };
    const texts = [...root.querySelectorAll<HTMLElement>('[data-fits]')].map(
        (node) => {
            const fontMm = Number(node.dataset['fontSizeMm']);
            const slot = node.dataset['slot'];

            return {
                fits: node.dataset['fits'] === 'true',
                overflowChars: Number(node.dataset['overflowChars'] ?? 0),
                ...(Number.isFinite(fontMm) && fontMm > 0 ? { fontMm } : {}),
                ...(slot === undefined ? {} : { slot }),
            };
        },
    );
    const area = root.querySelector<HTMLElement>('[data-background]');
    const background =
        area === null
            ? null
            : {
                  w: Number(area.dataset['w']),
                  h: Number(area.dataset['h']),
              };

    return {
        frame:
            frame !== null &&
            Number.isFinite(frame.w) &&
            Number.isFinite(frame.h)
                ? frame
                : null,
        ...(background !== null &&
        Number.isFinite(background.w) &&
        Number.isFinite(background.h)
            ? { background }
            : {}),
        texts,
    };
}
