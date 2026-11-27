import { EditionSession } from '@/features/edition/session';
import { baselineElement } from '@/lib/render/edition-baseline';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import { templateEdition } from '@/lib/render/edition-templates';
import type { Edition } from '@/lib/render/edition-types';
import {
    makeBus,
    makeEdition,
    ManualScheduler,
} from '@/testing/edition-test-utils';

import { editElement, resetElement, resetField } from './edit';

const open = (edition: Edition): EditionSession =>
    new EditionSession(edition, {
        storage: new MemoryEditionStorage(),
        bus: makeBus(null, 'w1'),
        now: () => 1_000,
        scheduler: new ManualScheduler(),
    });

const village = (): Edition => {
    const edition = templateEdition('village', 'nl');
    if (edition === undefined) {
        throw new Error('no template');
    }

    return edition;
};

describe('editElement', () => {
    it('merges fields into an element and clears a field set to undefined', () => {
        const session = open(makeEdition());

        editElement(session, 'space.01', { name: 'Dorpsstraat', text: 'Mooi' });
        editElement(session, 'space.01', { text: undefined });

        expect(session.edition.elements['space.01']).toEqual({
            name: 'Dorpsstraat',
        });
        expect(session.canUndo).toBe(true);
    });

    it('joins the steps of one gesture into one undo step', () => {
        const session = open(makeEdition());

        editElement(session, 'space.01', { name: 'A' }, 'typing');
        editElement(session, 'space.01', { name: 'AB' }, 'typing');
        session.undo();

        expect(session.edition.elements['space.01']).toBeUndefined();
    });

    it('records nothing when the patch changes nothing', () => {
        const session = open(makeEdition());

        editElement(session, 'space.01', {});

        expect(session.canUndo).toBe(false);
    });
});

describe('resetElement', () => {
    it('takes an element of a blank edition back to the standard game', () => {
        const session = open(makeEdition());
        editElement(session, 'space.01', { name: 'Dorpsstraat' });

        resetElement(session, 'space.01');

        expect(session.edition.elements['space.01']).toBeUndefined();
    });

    it('takes an element back to the template it started from', () => {
        const edition = village();
        const base = baselineElement(edition, 'space.01');
        const session = open(edition);
        editElement(session, 'space.01', { name: 'Elders', text: 'x' });

        resetElement(session, 'space.01');

        expect(base).toBeDefined();
        expect(session.edition.elements['space.01']).toEqual(base);
    });

    it('records nothing for an element that is already standard', () => {
        const session = open(makeEdition());

        resetElement(session, 'space.01');

        expect(session.canUndo).toBe(false);
    });
});

describe('resetField', () => {
    it('puts one field back and keeps the others', () => {
        const session = open(makeEdition());
        editElement(session, 'space.01', { name: 'Dorpsstraat', text: 'Mooi' });

        resetField(session, 'space.01', 'text');

        expect(session.edition.elements['space.01']).toEqual({
            name: 'Dorpsstraat',
        });
    });

    it('puts a field back to the value of the template', () => {
        const edition = village();
        const name = baselineElement(edition, 'space.01')?.name;
        const session = open(edition);
        editElement(session, 'space.01', { name: 'Elders' });

        resetField(session, 'space.01', 'name');

        expect(name).toBeDefined();
        expect(session.edition.elements['space.01']?.name).toBe(name);
    });
});
