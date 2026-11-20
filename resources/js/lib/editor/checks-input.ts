import type {
    CheckColor,
    CheckElement,
    CheckInput,
    CheckPhoto,
    CheckText,
} from '@/lib/checks/types';
import { parseKey } from '@/lib/edition/keys';
import { resolveEdition } from '@/lib/edition/resolve';
import type { Edition } from '@/lib/edition/types';
import { photoBleed } from '@/lib/editor/photo-bleed';
import type { PhotoInfos } from '@/lib/editor/photo-cache';
import { placementToTransform } from '@/lib/editor/photo-cache';
import { standardEdition } from '@/lib/game/standard-edition';
import type { Size } from '@/lib/print/types';
import { THEMES } from '@/lib/render/themes';

/** What the hidden probe render found for one element: the photo frame and how its texts fit. */
export interface ProbeResult {
    frame: Size | null;
    texts: { fits: boolean; overflowChars: number }[];
}

export type Probes = ReadonlyMap<string, ProbeResult>;

/** Keys of the elements the probe has to draw: customised ones in parts that are on. */
export function probeKeys(edition: Edition): string[] {
    return Object.entries(edition.elements)
        .filter(([key, override]) => {
            const part = parseKey(key)?.part;

            return (
                part !== undefined &&
                edition.parts[part] &&
                (override.photo !== undefined ||
                    override.name !== undefined ||
                    override.text !== undefined ||
                    override.amount !== undefined ||
                    override.layers !== undefined)
            );
        })
        .map(([key]) => key);
}

function textField(key: string): string {
    const kind = parseKey(key)?.kind;

    return kind === 'card' || kind === 'houseRules' ? 'text' : 'name';
}

/** Maps an edition and the probe results onto what the checks need (B94). */
export function buildCheckInput(
    edition: Edition,
    probes: Probes,
    photos: PhotoInfos,
): CheckInput {
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
        const field = textField(key);
        const texts: CheckText[] = probe.texts.map((text) => ({
            field,
            fit: text.fits
                ? { fits: true }
                : { fits: false, excessCharacters: text.overflowChars },
        }));
        elements.push({
            key,
            ...(photoChecks.length > 0 ? { photos: photoChecks } : {}),
            ...(texts.length > 0 ? { texts } : {}),
        });
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
        colors: colorsOf(edition),
    };
}

/** The colours the edition changed, with the colour they are printed on. */
function colorsOf(edition: Edition): CheckColor[] {
    const resolved = resolveEdition(edition);
    const board = THEMES[edition.theme].boardBackground;
    const colors: CheckColor[] = [];

    if (resolved.accent !== undefined) {
        colors.push({
            field: 'accent',
            name: { nl: 'Accentkleur', en: 'Accent colour' },
            hex: resolved.accent,
            role: 'accent',
            against: board,
        });
    }
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
        (node) => ({
            fits: node.dataset['fits'] === 'true',
            overflowChars: Number(node.dataset['overflowChars'] ?? 0),
        }),
    );

    return {
        frame:
            frame !== null &&
            Number.isFinite(frame.w) &&
            Number.isFinite(frame.h)
                ? frame
                : null,
        texts,
    };
}
