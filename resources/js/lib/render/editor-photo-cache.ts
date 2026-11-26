import type { SpaceIconSource } from '@/components/render/space-icon';
import { deedCrop } from '@/lib/render/edition-deed-photos';
import type { PhotoRecord } from '@/lib/render/edition-types';
import type { PhotoPlacement, SpaceIcon } from '@/lib/render/edition-types';
import { normalizeRotation } from '@/lib/render/editor-placements';
import type { PhotoSource, PhotoStyle } from '@/lib/render/photo';
import type { PhotoTransform } from '@/types/photos';

/** A stored photo ready to show: an object URL of the preview and the pixel size of the original. */
export type PhotoInfo = {
    id: string;
    url: string;
    width: number;
    height: number;
};

export type PhotoInfos = ReadonlyMap<string, PhotoInfo>;

/**
 * Object URLs for the photos an edition uses. Photos are loaded from storage once and shown
 * from their preview (B61). `dispose` frees the URLs; the cache can be used again after that.
 */
export class PhotoCache {
    private infos: Map<string, PhotoInfo> = new Map();
    private readonly requested = new Set<string>();
    private readonly listeners = new Set<() => void>();
    private disposed = false;

    constructor(
        private readonly load: (id: string) => Promise<PhotoRecord | undefined>,
    ) {}

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);

        return () => {
            this.listeners.delete(listener);
        };
    };

    getSnapshot = (): PhotoInfos => this.infos;

    private publish(): void {
        this.infos = new Map(this.infos);
        for (const listener of [...this.listeners]) {
            listener();
        }
    }

    /** Starts loading photos that are not known yet. */
    request(ids: Iterable<string>): void {
        this.disposed = false;
        for (const id of ids) {
            if (this.infos.has(id) || this.requested.has(id)) {
                continue;
            }
            this.requested.add(id);
            void this.load(id)
                .then((record) => {
                    if (record !== undefined && !this.disposed) {
                        this.add(record);
                    }
                })
                .catch(() => {
                    // A photo that cannot be read stays missing; the element shows its placeholder.
                    this.requested.delete(id);
                });
        }
    }

    /** Makes a photo that was just added available at once. */
    add(record: PhotoRecord): void {
        const old = this.infos.get(record.id);
        if (old !== undefined) {
            URL.revokeObjectURL(old.url);
        }
        this.infos.set(record.id, {
            id: record.id,
            url: URL.createObjectURL(record.preview ?? record.blob),
            width: record.width,
            height: record.height,
        });
        this.requested.add(record.id);
        this.publish();
    }

    dispose(): void {
        this.disposed = true;
        for (const info of this.infos.values()) {
            URL.revokeObjectURL(info.url);
        }
        this.infos = new Map();
        this.requested.clear();
    }
}

export const placementToTransform = (
    placement: PhotoPlacement,
): PhotoTransform => {
    return {
        x: placement.cx,
        y: placement.cy,
        scale: placement.scale,
        rotation: normalizeRotation(placement.rotation),
        grayscale: placement.grayscale,
        ...(placement.fit === true ? { fit: true } : {}),
    };
};

/** What the renderers need to draw a placement, or `undefined` while the photo is still loading. */
/** The icon of a special space for the renderers (B136); an uploaded image that is not loaded yet is left out. */
export const iconSource = (
    icon: SpaceIcon | undefined,
    infos: PhotoInfos,
): SpaceIconSource | undefined => {
    if (icon === undefined) {
        return undefined;
    }
    if ('preset' in icon) {
        return { preset: icon.preset };
    }
    const photo = photoSource(icon.photo, infos);

    return photo === undefined ? undefined : { photo, aspect: icon.aspect };
};

export const photoSource = (
    placement: PhotoPlacement | undefined,
    infos: PhotoInfos,
    style?: PhotoStyle,
): PhotoSource | undefined => {
    if (placement === undefined) {
        return undefined;
    }
    const info = infos.get(placement.photoId);
    if (info === undefined) {
        return undefined;
    }
    // A deed that borrows the photo of its space crops it for its own narrow frame (B177).
    const shown =
        placement.borrowed === true
            ? deedCrop(placement, info, style)
            : placement;

    return {
        src: info.url,
        ...(style === 'full' ? { style } : {}),
        width: info.width,
        height: info.height,
        transform: placementToTransform(shown),
    };
};
