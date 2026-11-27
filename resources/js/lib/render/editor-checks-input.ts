import type {
    CheckColor,
    CheckInput,
    CheckNamePlace,
} from '@/lib/render/checks-types';
import { withDeedPhotos } from '@/lib/render/edition-deed-photos';
import {
    BOARD_CENTER_KEY,
    HOUSE_RULES_KEY,
    INVITATION_KEY,
    PAWN_COUNT,
    parseKey,
    pawnKey,
} from '@/lib/render/edition-keys';
import { resolveEdition } from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';
import {
    withAmountChecks,
    withCardTextChecks,
} from '@/lib/render/editor-checks-amounts';
import {
    measuredElements,
    wordProbes,
} from '@/lib/render/editor-checks-elements';
import { emptyNameKeys } from '@/lib/render/editor-clear-names';
import { cardHasText, deckCardKeys } from '@/lib/render/editor-extra-cards';
import { centerFoldItems } from '@/lib/render/editor-layer-fold';
import { layersOverLidText } from '@/lib/render/editor-layers';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import {
    BOOKLET_TITLE_BOX,
    NOTE_NAME_BOX,
    fitsNameBox,
} from '@/lib/render/name-boxes';
import { standardEdition } from '@/lib/render/standard-edition';
import { THEMES } from '@/lib/render/themes';
import type { Size } from '@/types/print';

/** What the hidden probe render found for one element: the photo frame and how its texts fit. */
export type ProbeResult = {
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
};

export type Probes = ReadonlyMap<string, ProbeResult>;

/**
 * Keys of the elements the probe has to draw: customised ones in parts that are on, and the elements that
 * show a custom word (a deed for a new house name, a space for a new deck name).
 */
export const probeKeys = (stored: Edition): string[] => {
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
};

/**
 * Pawns in the set that still lack a photo. Only once one pawn has a photo: pawns with just a name are a fine
 * set, so a fresh edition does not start with a warning per pawn (UX 9, ronde 3).
 */
const pawnsWithoutPhoto = (edition: Edition): string[] => {
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
};

/** The pixel size of the photo over the whole board centre, for the fold check (B261). */
const backgroundSize = (
    edition: Edition,
    photos: PhotoInfos,
): { w: number; h: number } | undefined => {
    const id = edition.elements[BOARD_CENTER_KEY]?.background?.photoId;
    const info = id === undefined ? undefined : photos.get(id);

    return info === undefined ? undefined : { w: info.width, h: info.height };
};

/** Maps an edition and the probe results onto what the checks need (B94). */
export const buildCheckInput = (
    stored: Edition,
    probes: Probes,
    photos: PhotoInfos,
): CheckInput => {
    const edition = withDeedPhotos(stored, photos);
    const measured = measuredElements(stored, edition, probes, photos);
    const elements = withAmountChecks(
        edition.parts.cards ? withCardTextChecks(measured, edition) : measured,
        edition,
    );

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
            ? centerFoldItems(
                  edition,
                  resolveEdition(edition).boardCenter,
                  backgroundSize(edition, photos),
              )
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
};

/**
 * The printed parts where the edition name does not fit, even wrapped at the smallest size: the title of the rules
 * booklet and the strip of the banknotes (bug 14 of test round 3). Measured with the rough measure, so only a very
 * long name or word is reported.
 */
const longNamePlaces = (edition: Edition): CheckNamePlace[] => {
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
};

/** The colours the edition changed, with the colour they are printed on. */
const colorsOf = (edition: Edition): CheckColor[] => {
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
};

/** Reads photo frames and text fits out of a rendered element (the elements mark them with data attributes). */
export const readProbe = (root: HTMLElement): ProbeResult => {
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
};
