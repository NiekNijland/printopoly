import type {
    CheckElement,
    CheckPhoto,
    CheckText,
} from '@/lib/render/checks-types';
import { deedPhotoOf } from '@/lib/render/edition-deed-photos';
import {
    WORD_IDS,
    parseKey,
    spaceKey,
    wordKey,
} from '@/lib/render/edition-keys';
import type { Edition, ElementOverride } from '@/lib/render/edition-types';
import { resolveWords } from '@/lib/render/edition-words';
import type { Probes, ProbeResult } from '@/lib/render/editor-checks-input';
import { photoBleed } from '@/lib/render/editor-photo-bleed';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { placementToTransform } from '@/lib/render/editor-photo-cache';
import { WORD_PROBES } from '@/lib/render/editor-word-probes';
import { iconTargets } from '@/lib/render/print-photo-targets';
import { deedsFor } from '@/lib/render/standard-edition';

/** The words the edition changed, with the elements that show them (and that are printed). */
export const wordProbes = (edition: Edition) => {
    const custom = resolveWords(edition).custom;

    return WORD_IDS.filter((id) => custom[id]).flatMap((id) =>
        WORD_PROBES[id]
            .filter((probe) => edition.parts[probe.part])
            .map((probe) => ({ id, ...probe })),
    );
};

const textField = (key: string): string => {
    const kind = parseKey(key)?.kind;

    return kind === 'card' || kind === 'houseRules' || kind === 'invitation'
        ? 'text'
        : 'name';
};

/** The space whose photo a title deed shows (B157), so a small photo gives one message for both (R5-09). */
const borrowedFrom = (edition: Edition, key: string): string | undefined => {
    if (parseKey(key)?.kind !== 'deed') {
        return undefined;
    }
    const index = Number(key.split('.')[1]);
    const space = deedsFor()[index - 1];

    return space !== undefined && deedPhotoOf(edition, index)?.from === 'space'
        ? spaceKey(space.position)
        : undefined;
};

const photoChecksOf = (
    stored: Edition,
    key: string,
    override: ElementOverride,
    probe: ProbeResult,
    photos: PhotoInfos,
): CheckPhoto[] => {
    const photoChecks: CheckPhoto[] = [];
    if (override.photo !== undefined && probe.frame !== null) {
        const info = photos.get(override.photo.photoId);
        const from = borrowedFrom(stored, key);
        if (info !== undefined) {
            photoChecks.push({
                field: 'photo',
                source: { w: info.width, h: info.height },
                transform: placementToTransform(override.photo),
                frame: probe.frame,
                bleed: photoBleed(key, override.photoStyle),
                ...(from === undefined ? {} : { borrowedFrom: from }),
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

    return photoChecks;
};

const probedElements = (
    stored: Edition,
    edition: Edition,
    probes: Probes,
    photos: PhotoInfos,
): CheckElement[] => {
    const elements: CheckElement[] = [];

    for (const [key, override] of Object.entries(edition.elements)) {
        const probe = probes.get(key);
        if (probe === undefined) {
            continue;
        }
        const photoChecks = photoChecksOf(stored, key, override, probe, photos);
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

    return elements;
};

const withIconChecks = (
    elements: CheckElement[],
    edition: Edition,
    photos: PhotoInfos,
): CheckElement[] => {
    const out = [...elements];

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
        const existing = out.find((element) => element.key === key);
        if (existing === undefined) {
            out.push({ key, photos: [check] });
        } else {
            existing.photos = [...(existing.photos ?? []), check];
        }
    }

    return out;
};

const withWordChecks = (
    elements: CheckElement[],
    edition: Edition,
    probes: Probes,
): CheckElement[] => {
    const out = [...elements];

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
            out.push({ key: wordKey(probe.id), texts });
        }
    }

    return out;
};

export const measuredElements = (
    stored: Edition,
    edition: Edition,
    probes: Probes,
    photos: PhotoInfos,
): CheckElement[] => {
    return withWordChecks(
        withIconChecks(
            probedElements(stored, edition, probes, photos),
            edition,
            photos,
        ),
        edition,
        probes,
    );
};
