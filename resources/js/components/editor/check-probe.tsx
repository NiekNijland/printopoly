import {
    useDeferredValue,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';

import { runChecks } from '@/lib/checks/checks';
import type { CheckIssue } from '@/lib/checks/types';
import { parseKey } from '@/lib/edition/keys';
import { resolveEdition, type ResolvedEdition } from '@/lib/edition/resolve';
import type { Edition } from '@/lib/edition/types';
import {
    buildCheckInput,
    probeKeys,
    readProbe,
    type Probes,
} from '@/lib/editor/checks-input';
import type { PhotoInfos } from '@/lib/editor/photo-cache';

import { ElementPreview, previewSize } from './element-preview';

interface CheckProbeProps {
    edition: Edition;
    resolved: ResolvedEdition;
    photos: PhotoInfos;
    onProbes: (probes: Probes) => void;
}

/**
 * Draws every customised element out of sight, at true size, and reports where the photo
 * frames are and whether the texts fit. The Controle list and the warnings next to the fields
 * come from that, so they agree with what the renderers do (B94).
 */
function CheckProbe({ edition, resolved, photos, onProbes }: CheckProbeProps) {
    const root = useRef<HTMLDivElement>(null);
    const keys = probeKeys(edition);
    const last = useRef('');

    const report = useRef(onProbes);
    useEffect(() => {
        report.current = onProbes;
    });

    const read = (): void => {
        const element = root.current;
        if (element === null) {
            return;
        }
        const probes = new Map(
            [...element.querySelectorAll<HTMLElement>('[data-probe-key]')].map(
                (node) => [node.dataset['probeKey'] ?? '', readProbe(node)],
            ),
        );
        const signature = JSON.stringify([...probes]);
        if (signature !== last.current) {
            last.current = signature;
            report.current(probes);
        }
    };

    useEffect(read);

    // A text measures itself again when a web font has loaded, and a photo frame can change on its own: those
    // renders happen inside the elements and not here, so read again whenever the drawn elements change.
    // Without this the Controle kept what it read first, and that depended on how fast the device loaded
    // fonts and photos: a phone and a desktop counted a different number of messages for the same edition.
    useEffect(() => {
        const element = root.current;
        if (element === null || typeof MutationObserver === 'undefined') {
            return undefined;
        }
        const observer = new MutationObserver(read);
        observer.observe(element, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['data-fits', 'data-overflow-chars', 'style'],
        });

        // `read` only touches refs, so one observer for the life of the probe is enough.
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={root}
            aria-hidden="true"
            inert
            style={{
                position: 'fixed',
                left: -100000,
                top: 0,
                width: 0,
                height: 0,
                overflow: 'hidden',
            }}
        >
            {keys.map((key) => {
                const size = previewSize({ key }, edition);

                return (
                    <div
                        key={key}
                        data-probe-key={key}
                        style={{
                            position: 'relative',
                            width: `${size.w}mm`,
                            height: `${size.h}mm`,
                        }}
                    >
                        <ElementPreview
                            target={{
                                key,
                                deed: parseKey(key)?.kind === 'deed',
                            }}
                            resolved={resolved}
                            photos={photos}
                        />
                    </div>
                );
            })}
        </div>
    );
}

/** The hidden probe and the issues it leads to, for an edition. */
export function useChecks(
    edition: Edition,
    photos: PhotoInfos,
): { issues: CheckIssue[]; probe: ReactNode } {
    const deferred = useDeferredValue(edition);
    const [probes, setProbes] = useState<Probes>(new Map());
    const resolved = useMemo(() => resolveEdition(deferred), [deferred]);
    const issues = useMemo(
        () => runChecks(buildCheckInput(deferred, probes, photos)),
        [deferred, probes, photos],
    );

    return {
        issues,
        probe: (
            <CheckProbe
                edition={deferred}
                resolved={resolved}
                photos={photos}
                onProbes={setProbes}
            />
        ),
    };
}
