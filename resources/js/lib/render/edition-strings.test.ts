import { describe, expect, it } from 'vitest';

import { messages } from './edition-strings';

describe('messages: settings.language', () => {
    it('says the standard texts change when there are no own names', () => {
        expect(messages.nl.settings.language('English', 0)).toBe(
            'Taal naar English: de standaardteksten worden Engels.',
        );
        expect(messages.en.settings.language('Nederlands', 0)).toBe(
            'Language to Nederlands: the default texts become Dutch.',
        );
    });

    it('counts one own street name in the singular', () => {
        expect(messages.nl.settings.language('Nederlands', 1)).toBe(
            'Taal naar Nederlands: je 1 eigen straatnaam blijft, de standaardteksten worden Nederlands.',
        );
        expect(messages.en.settings.language('English', 1)).toBe(
            'Language to English: your 1 own street name stays, the default texts become English.',
        );
    });

    it('counts several own street names in the plural', () => {
        expect(messages.nl.settings.language('English', 4)).toBe(
            'Taal naar English: je 4 eigen straatnamen blijven, de standaardteksten worden Engels.',
        );
        expect(messages.en.settings.language('Nederlands', 3)).toBe(
            'Language to Nederlands: your 3 own street names stay, the default texts become Dutch.',
        );
    });
});

describe('messages: settings.partOff and partOn', () => {
    it('turns a part off without changes', () => {
        expect(messages.nl.settings.partOff('money', 0)).toBe(
            'Speelgeld overslaan: je kunt het later weer aanzetten.',
        );
        expect(messages.en.settings.partOff('pawns', 0)).toBe(
            'Skip pawns: you can turn it back on later.',
        );
    });

    it('keeps one or more changes of a part that goes off', () => {
        expect(messages.nl.settings.partOff('board', 1)).toBe(
            'Bord overslaan: je 1 aangepaste vak blijft bewaard en komt terug als je het weer aanzet.',
        );
        expect(messages.nl.settings.partOff('deeds', 3)).toBe(
            'Eigendomsbewijzen overslaan: je 3 aangepaste eigendomsbewijzen blijven bewaard en komen terug als je het weer aanzet.',
        );
        expect(messages.en.settings.partOff('cards', 1)).toBe(
            'Skip Chance and Community Chest: your 1 edited card is kept and comes back when you turn it on again.',
        );
        expect(messages.en.settings.partOff('boxLid', 2)).toBe(
            'Skip box lid: your 2 edited changes are kept and come back when you turn it on again.',
        );
    });

    it('brings a part back with its changes', () => {
        expect(messages.nl.settings.partOn('invitation', 0)).toBe(
            'Uitnodiging weer aan.',
        );
        expect(messages.nl.settings.partOn('pawns', 1)).toBe(
            'Pionnen weer aan: je 1 aangepaste pion is terug.',
        );
        expect(messages.nl.settings.partOn('money', 5)).toBe(
            'Speelgeld weer aan: je 5 aangepaste biljetten zijn terug.',
        );
        expect(messages.en.settings.partOn('houseRules', 0)).toBe(
            'House rules on again.',
        );
        expect(messages.en.settings.partOn('deeds', 1)).toBe(
            'Title deeds on again: your 1 edited title deed is back.',
        );
        expect(messages.en.settings.partOn('rulesBooklet', 2)).toBe(
            'Rules booklet on again: your 2 edited changes are back.',
        );
    });
});

describe('messages: settings.theme and boardProfile', () => {
    it('names the new theme', () => {
        expect(messages.nl.settings.theme('Gala')).toBe('Thema naar Gala.');
        expect(messages.en.settings.theme('Sleek')).toBe('Theme to Sleek.');
    });

    it('mentions photos only when there are any', () => {
        expect(messages.nl.settings.boardProfile(0)).toBe(
            'Andere bordmaat: print het proefvel opnieuw.',
        );
        expect(messages.nl.settings.boardProfile(2)).toBe(
            "Andere bordmaat: foto's blijven op hun plek; het proefvel opnieuw printen.",
        );
        expect(messages.en.settings.boardProfile(0)).toBe(
            'Different board size: print the test sheet again.',
        );
        expect(messages.en.settings.boardProfile(1)).toBe(
            'Different board size: photos stay where they are. Print the test sheet again.',
        );
    });
});

describe('messages: summary', () => {
    it('counts in the singular and plural', () => {
        const nl = messages.nl.summary;
        const en = messages.en.summary;

        expect([nl.deeds(1), nl.deeds(2)]).toEqual([
            '1 eigendomsbewijs',
            '2 eigendomsbewijzen',
        ]);
        expect([nl.cards(1), nl.cards(3)]).toEqual(['1 kaart', '3 kaarten']);
        expect([nl.notes(1), nl.notes(7)]).toEqual(['1 biljet', '7 biljetten']);
        expect([nl.pawns(1), nl.pawns(8)]).toEqual(['1 pion', '8 pionnen']);
        expect(nl.spaces(4)).toBe('4 vakken');
        expect(nl.space('Molenweg')).toBe('Molenweg');
        expect([en.deeds(1), en.deeds(2)]).toEqual([
            '1 title deed',
            '2 title deeds',
        ]);
        expect([en.cards(1), en.cards(2)]).toEqual(['1 card', '2 cards']);
        expect([en.notes(1), en.notes(2)]).toEqual(['1 note', '2 notes']);
        expect([en.pawns(1), en.pawns(2)]).toEqual(['1 pawn', '2 pawns']);
        expect(en.spaces(9)).toBe('9 spaces');
        expect(en.space('Mill Lane')).toBe('Mill Lane');
    });
});

describe('messages: pawnName and sync', () => {
    it('numbers a pawn', () => {
        expect(messages.nl.pawnName(3)).toBe('Pion 3');
        expect(messages.en.pawnName(5)).toBe('Pawn 5');
    });

    it('greets by name when there is one and counts the editions', () => {
        expect(messages.nl.sync.title(1, 'Kees')).toBe(
            'Welkom, Kees. Je hebt 1 editie in deze browser.',
        );
        expect(messages.nl.sync.title(3, undefined)).toBe(
            'Je hebt 3 edities in deze browser.',
        );
        expect(messages.en.sync.title(1, undefined)).toBe(
            'You have 1 edition in this browser.',
        );
        expect(messages.en.sync.title(2, 'Kees')).toBe(
            'Welcome, Kees. You have 2 editions in this browser.',
        );
    });

    it('speaks of it or them in the body', () => {
        expect(messages.nl.sync.body(1)).toBe(
            'Wil je hem in je account bewaren? Dan zie je hem op elk apparaat waar je inlogt, ook als je deze browser leegmaakt.',
        );
        expect(messages.nl.sync.body(2)).toContain('Wil je ze in je account');
        expect(messages.en.sync.body(1)).toBe(
            'Want to keep it in your account? Then you can open it on any device you log in on, even if you clear this browser.',
        );
        expect(messages.en.sync.body(4)).toContain('open them on any device');
    });

    it('names the account limit', () => {
        expect(messages.nl.sync.overLimit(10)).toBe(
            'In een account passen 10 edities. Kies welke je bewaart.',
        );
        expect(messages.en.sync.overLimit(10)).toBe(
            'An account holds 10 editions. Choose which ones to keep.',
        );
    });
});
