import type {
    CheckElement,
    CheckInput,
    CheckPhoto,
    CheckText,
} from '@/lib/checks/types';
import { parseKey } from '@/lib/edition/keys';
import { THEME_LAYOUTS } from '@/lib/edition/keys';
import type { Edition, ElementOverride } from '@/lib/edition/types';
import type { PhotoInfos } from '@/lib/editor/photo-cache';
import { placementToTransform } from '@/lib/editor/photo-cache';
import { FULL_BLEED_MM } from '@/lib/editor/placements';
import type { Size } from '@/lib/print/types';

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

function layoutOf(edition: Edition, override: ElementOverride): string {
    const supported = THEME_LAYOUTS[edition.theme];

    return override.layout !== undefined && supported.includes(override.layout)
        ? override.layout
        : 'frame';
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
                    bleed:
                        layoutOf(edition, override) === 'full'
                            ? FULL_BLEED_MM
                            : 0,
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
    };
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
