import { describe, expect, it } from 'vitest';
import type { EditionSummary } from '../../lib/render/edition-types';
import {
    buildSyncQuestion,
    findRemoteOnly,
    type RemoteEditionSummary,
} from './sync';

const summary = (id: string, name = id): EditionSummary => {
    return {
        id,
        name,
        language: 'nl',
        theme: 'classic',
        revision: 0,
        updatedAt: 1,
        createdAt: 1,
        customizedSpaces: 0,
        customizedElements: 0,
        customizedPercent: 0,
    };
};

const remote = (id: string): RemoteEditionSummary => ({
    id,
    name: id,
    revision: 1,
    updatedAt: 1,
});

describe('the local-only and remote-only editions', () => {
    it('compares by id', () => {
        const local = [summary('a'), summary('b'), summary('c')];
        const server = [remote('b'), remote('z')];
        expect(
            buildSyncQuestion(local, server, { locale: 'nl' })?.editions.map(
                (e) => e.id,
            ),
        ).toEqual(['a', 'c']);
        expect(findRemoteOnly(local, server).map((e) => e.id)).toEqual(['z']);
    });
});

describe('buildSyncQuestion', () => {
    it('asks one question with the wording of the design (B81)', () => {
        const question = buildSyncQuestion(
            [summary('a'), summary('b'), summary('c')],
            [],
            {
                locale: 'nl',
                userName: 'Niek',
            },
        );
        expect(question).toMatchObject({
            count: 3,
            title: 'Welkom, Niek. Je hebt 3 edities in deze browser.',
            body: 'Wil je ze in je account bewaren? Dan zie je ze op elk apparaat waar je inlogt, ook als je deze browser leegmaakt.',
            accept: 'Bewaren in mijn account',
            decline: 'Nu niet',
            overLimit: null,
        });
    });

    it('counts only editions the account does not have', () => {
        const question = buildSyncQuestion(
            [summary('a'), summary('b')],
            [remote('a')],
            { locale: 'nl' },
        );
        expect(question?.count).toBe(1);
        expect(question?.title).toBe('Je hebt 1 editie in deze browser.');
        expect(question?.body).toContain('Wil je hem in je account bewaren?');
        expect(question?.editions.map((e) => e.id)).toEqual(['b']);
    });

    it('asks nothing when everything is already in the account', () => {
        expect(
            buildSyncQuestion([summary('a')], [remote('a')], { locale: 'nl' }),
        ).toBeNull();
        expect(buildSyncQuestion([], [], { locale: 'nl' })).toBeNull();
    });

    it('has English wording', () => {
        const question = buildSyncQuestion([summary('a'), summary('b')], [], {
            locale: 'en',
            userName: 'Sam',
        });
        expect(question?.title).toBe(
            'Welcome, Sam. You have 2 editions in this browser.',
        );
        expect(question?.accept).toBe('Keep in my account');
    });

    it('warns when not everything fits in the account (B70)', () => {
        const local = [summary('a'), summary('b'), summary('c')];
        const server = Array.from({ length: 18 }, (_, i) => remote(`r${i}`));
        const question = buildSyncQuestion(local, server, { locale: 'nl' });
        expect(question?.overLimit).toEqual({
            limit: 20,
            room: 2,
            message: 'In een account passen 20 edities. Kies welke je bewaart.',
        });
        expect(
            buildSyncQuestion(local, [], { locale: 'nl', limit: 2 })?.overLimit
                ?.room,
        ).toBe(2);
    });
});
