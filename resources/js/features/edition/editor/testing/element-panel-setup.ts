import { screen } from '@testing-library/react';

import { EditionBus } from '@/features/edition/bus';
import type { ElementPanelProps } from '@/features/edition/editor/element-panel';
import { EditionSession } from '@/features/edition/session';
import type { CheckIssue } from '@/lib/render/checks-types';
import { resolveEdition } from '@/lib/render/edition-resolve';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import type { ElementOverride } from '@/lib/render/edition-types';
import { PhotoCache } from '@/lib/render/editor-photo-cache';
import { newPlacement } from '@/lib/render/editor-placements';
import { installMemoryServices, sampleEdition } from '@/testing/editions';

export const context = {
    source: { w: 4000, h: 3000 },
    frame: { w: 40, h: 30 },
    bleed: 0,
};

/** The ⋯ menu of the panel head (the phone has a second one in the panel). */
export const menuButton = (name: string): HTMLElement => {
    const [first] = screen.getAllByRole('button', { name });
    if (first === undefined) {
        throw new Error(`no button ${name}`);
    }

    return first;
};

export const setup = async (
    key: string,
    options: {
        withPhoto?: boolean;
        named?: boolean;
        issues?: CheckIssue[];
        elements?: Record<string, ElementOverride>;
    } = {},
) => {
    installMemoryServices();
    const storage = new MemoryEditionStorage();
    const base = sampleEdition({
        parts: { money: true, pawns: true, boxLid: true, houseRules: true },
    });
    const edition = options.withPhoto
        ? {
              ...base,
              elements: { [key]: { photo: newPlacement('p1', context) } },
          }
        : options.named === true
          ? { ...base, elements: { [key]: { name: 'Jans Bierkelder' } } }
          : options.elements !== undefined
            ? { ...base, elements: options.elements }
            : base;
    await storage.createEdition(edition);
    const session = new EditionSession(edition, {
        storage,
        bus: new EditionBus(null, 'w'),
        now: () => 5,
        debounceMs: 1000,
    });
    const onAct = vi.fn();
    const props: ElementPanelProps = {
        session,
        edition,
        resolved: resolveEdition(edition),
        editKey: key,
        title: 'Molenweg',
        context: options.withPhoto ? context : null,
        onAct,
        cache: new PhotoCache(() => Promise.resolve(undefined)),
        issues: options.issues ?? [],
        siblings: ['space.03'],
    };

    return { session, onAct, props };
};
