import { describe, expect, it } from 'vitest';

import { runChecks } from '@/lib/render/checks';
import { cardTextProblems } from '@/lib/render/edition-card-text';
import { updateElement } from '@/lib/render/edition-changes';
import type { Edition } from '@/lib/render/edition-types';
import { makeEdition, photo } from '@/testing/edition-test-utils';

import { buildCheckInput, type ProbeResult } from './editor-checks-input';
import type { PhotoInfos } from './editor-photo-cache';

function withElement(
    edition: Edition,
    key: string,
    patch: Parameters<typeof updateElement>[2],
): Edition {
    return updateElement(edition, key, patch).edition;
}

const codes = (edition: Edition, probes = new Map<string, ProbeResult>()) =>
    runChecks(buildCheckInput(edition, probes, new Map())).map(
        (issue) => issue.code,
    );

describe('Controle: card text and amount line (bug 8, ronde 3)', () => {
    // chest.03 pays 50 (40 to 60).
    it('warns when the text names another amount than the line under it', () => {
        const edition = withElement(
            makeEdition({ language: 'nl' }),
            'card.chest.03',
            { text: 'Betaal 45 aan de tandarts.' },
        );
        const issue = runChecks(
            buildCheckInput(edition, new Map(), new Map()),
        ).find((item) => item.code === 'text.amount-differs');

        expect(issue?.message.nl).toBe(
            'De tekst noemt 45, maar onderaan de kaart staat €\u00A050. Zet het bedrag op 45, of haal het getal uit de tekst.',
        );
        expect(issue?.data).toEqual({ mentioned: -45, allowed: true });
    });

    it('says the range when the named amount is not allowed', () => {
        const edition = withElement(
            makeEdition({ language: 'nl' }),
            'card.chest.03',
            { text: 'Betaal € 500 aan de tandarts.' },
        );
        const issue = runChecks(
            buildCheckInput(edition, new Map(), new Map()),
        ).find((item) => item.code === 'text.amount-differs');

        expect(issue?.data?.allowed).toBe(false);
        expect(issue?.message.nl).toContain('van 40 tot 60');
    });

    it('does not count numbers that are not money, or the amount itself', () => {
        expect(
            cardTextProblems(
                'Ga 3 vakjes terug en betaal.',
                makeEdition(),
                -50,
            ),
        ).toEqual([]);
        expect(
            cardTextProblems('Groep 6 betaalt de taart.', makeEdition(), -50),
        ).toEqual([]);
        expect(
            cardTextProblems(
                'Je krijgt {currency} 15 van iedere speler.',
                makeEdition(),
                10,
            ),
        ).toEqual([{ kind: 'amount-differs', mentioned: 15 }]);
        expect(
            cardTextProblems('Betaal 50.', makeEdition(), -50).map(
                (problem) => problem.kind,
            ),
        ).toEqual(['amount-twice']);
        // No amount line, nothing to disagree with.
        expect(
            cardTextProblems('Betaal 15.', makeEdition(), undefined),
        ).toEqual([]);
    });
});

describe('Controle: empty house rules (bug 20, ronde 3)', () => {
    const base = () => {
        const edition = makeEdition({ language: 'nl' });

        return { ...edition, parts: { ...edition.parts, houseRules: true } };
    };

    it('warns when someone started the house rules card and emptied it again', () => {
        expect(
            codes(withElement(base(), 'house_rules', { text: '   ' })),
        ).toContain('house-rules.empty');
        // Only a photo: the card does not print without a rule on it.
        expect(
            codes(withElement(base(), 'house_rules', { photo: photo() })),
        ).toContain('house-rules.empty');
    });

    it('is quiet with text, with an untouched card, or with the card out of the set (B210)', () => {
        expect(
            codes(
                withElement(base(), 'house_rules', {
                    text: 'Geen geld onder het bord.',
                }),
            ),
        ).not.toContain('house-rules.empty');
        // An untouched empty card is simply left out, so cards in the set give no warning about it.
        expect(codes(base())).not.toContain('house-rules.empty');
        expect(codes(makeEdition())).not.toContain('house-rules.empty');
    });
});

describe('Controle: invitation without date and place (R5-28)', () => {
    const base = () => {
        const edition = makeEdition({ language: 'nl' });

        return { ...edition, parts: { ...edition.parts, invitation: true } };
    };

    it('warns when the invitation is in the set and still has the dotted lines', () => {
        const issue = runChecks(
            buildCheckInput(base(), new Map(), new Map()),
        ).find((item) => item.code === 'invitation.blank');

        expect(issue?.elementKey).toBe('invitation');
        expect(issue?.field).toBe('text');
        expect(
            codes(withElement(base(), 'invitation', { text: '  ' })),
        ).toContain('invitation.blank');
    });

    it('is quiet once the text says something, or with the invitation out of the set', () => {
        expect(
            codes(
                withElement(base(), 'invitation', {
                    text: 'Zaterdag 12 juni, 14:00\nDorpsstraat 4',
                }),
            ),
        ).not.toContain('invitation.blank');
        expect(codes(makeEdition())).not.toContain('invitation.blank');
    });
});

describe('Controle: tiny letters on the board (bug 13, ronde 3)', () => {
    const named = () =>
        withElement(makeEdition({ language: 'nl' }), 'space.01', {
            name: 'De allerlangste straatnaam van het hele dorp',
        });

    it('warns when a name on a space fits only below 5 pt', () => {
        const probes = new Map<string, ProbeResult>([
            [
                'space.01',
                {
                    frame: null,
                    texts: [
                        {
                            fits: true,
                            overflowChars: 0,
                            fontMm: 1.6,
                            slot: 'town',
                        },
                        {
                            fits: true,
                            overflowChars: 0,
                            fontMm: 2.4,
                            slot: 'name',
                        },
                    ],
                },
            ],
        ]);
        const issues = runChecks(buildCheckInput(named(), probes, new Map()));
        const small = issues.filter((item) => item.code === 'text.too-small');

        expect(small).toHaveLength(1);
        expect(small[0]?.field).toBe('town');
        expect(small[0]?.message.nl).toContain('4,5 pt');
    });

    it('does not warn for a card, where the letter size is fine to read up close', () => {
        const edition = withElement(makeEdition(), 'card.chance.01', {
            text: 'Lang verhaal',
        });
        const probes = new Map<string, ProbeResult>([
            [
                'card.chance.01',
                {
                    frame: null,
                    texts: [{ fits: true, overflowChars: 0, fontMm: 1.5 }],
                },
            ],
        ]);

        expect(codes(edition, probes)).not.toContain('text.too-small');
    });
});

describe('Controle: photos in the board centre (bug 23, ronde 3)', () => {
    const tiny: PhotoInfos = new Map([
        ['p1', { id: 'p1', url: '', width: 120, height: 90 }],
    ]);

    it('checks the resolution of a photo over the whole centre', () => {
        const edition = withElement(makeEdition(), 'board_center', {
            background: photo('p1'),
        });
        const probes = new Map<string, ProbeResult>([
            [
                'board_center',
                { frame: null, background: { w: 180, h: 180 }, texts: [] },
            ],
        ]);
        const issues = runChecks(buildCheckInput(edition, probes, tiny));

        expect(
            issues.find((item) => item.code === 'photo.low-resolution')?.field,
        ).toBe('background');
    });

    it('checks a photo layer at the size of its layer', () => {
        const edition = withElement(makeEdition(), 'board_center', {
            layers: [
                {
                    id: 'l1',
                    kind: 'photo',
                    photo: photo('p1'),
                    x: 10,
                    y: 10,
                    w: 120,
                    h: 90,
                },
            ],
        });
        const probes = new Map<string, ProbeResult>([
            ['board_center', { frame: null, texts: [] }],
        ]);
        const issues = runChecks(buildCheckInput(edition, probes, tiny));

        expect(
            issues.find((item) => item.code === 'photo.low-resolution')?.field,
        ).toBe('layer.l1');
    });
});

describe('Controle: the same message once (bug 31, ronde 3)', () => {
    it('keeps one row when two texts of one element do not fit', () => {
        const edition = withElement(makeEdition(), 'space.01', {
            name: 'Heel erg lang',
        });
        const probes = new Map<string, ProbeResult>([
            [
                'space.01',
                {
                    frame: null,
                    texts: [
                        { fits: false, overflowChars: 4 },
                        { fits: false, overflowChars: 4 },
                    ],
                },
            ],
        ]);

        expect(
            codes(edition, probes).filter((code) => code === 'text.too-long'),
        ).toHaveLength(1);
    });
});

describe('Controle: pawns without a photo (UX 9, ronde 3)', () => {
    const withPawns = (): Edition => {
        const edition = makeEdition({ language: 'nl' });

        return { ...edition, parts: { ...edition.parts, pawns: true } };
    };

    it('stays quiet while no pawn has a photo', () => {
        expect(codes(withPawns())).not.toContain('pawns.no-photo');
    });

    it('names the others once one pawn has a photo', () => {
        const edition = withElement(withPawns(), 'pawn.01', {
            photo: photo(),
        });
        const issue = runChecks(
            buildCheckInput(edition, new Map(), new Map()),
        ).find((item) => item.code === 'pawns.no-photo');

        expect(issue?.elementKey).toBe('pawn.02');
        expect(issue?.message.nl).toContain('7 pionnen');
    });
});
