import type { Locale } from '@/lib/game/types';
import type { PartId, ThemeId } from './types';

/** User-facing strings of the edition model. NL wording is taken from the design files (Staten, Mijn edities). */
export interface Messages {
    pawnName(n: number): string;
    loginAction: string;
    languageName: Record<Locale, string>;
    themeName: Record<ThemeId, string>;
    layoutFrame: string;
    partName: Record<PartId, string>;
    save: {
        saving: string;
        savedLocal: string;
        savedAccount: string;
        offline: string;
        privateWindow: string;
        safariEviction: string;
        storageNearlyFull: string;
        storageFull: string;
        saveFailed: string;
    };
    settings: {
        language(languageName: string, customNames: number): string;
        theme(themeName: string, layoutName: string, remapped: number): string;
        partOff(part: PartId, customized: number): string;
        partOn(part: PartId, customized: number): string;
        boardProfile(photos: number): string;
    };
    summary: {
        suffix: string;
        and: string;
        space(name: string): string;
        spaces(n: number): string;
        deeds(n: number): string;
        cards(n: number): string;
        notes(n: number): string;
        pawns(n: number): string;
        boxLid: string;
        boardCenter: string;
        houseRules: string;
        cardBacks: string;
        settings: string;
    };
    conflict: { thisWindow: string; otherWindow: string };
    sync: {
        title(count: number, userName: string | undefined): string;
        body(count: number): string;
        accept: string;
        decline: string;
        overLimit(limit: number): string;
    };
}

const nl: Messages = {
    pawnName: (n) => `Pion ${n}`,
    loginAction: 'Inloggen met Google',
    languageName: { nl: 'Nederlands', en: 'English' },
    themeName: { classic: 'Klassiek', riso: 'Riso', strak: 'Strak' },
    layoutFrame: 'Foto in kader',
    partName: {
        board: 'Bord',
        deeds: 'Eigendomsbewijzen',
        cards: 'Kans en Algemeen Fonds',
        money: 'Speelgeld',
        pawns: 'Pionnen',
        boxLid: 'Doosdeksel',
        houseRules: 'Huisregels',
    },
    save: {
        saving: 'Opslaan…',
        savedLocal: 'Alleen in deze browser',
        savedAccount: 'Opgeslagen in je account',
        offline: 'Offline: alleen in deze browser. Zodra je weer online bent, gaat het naar je account.',
        privateWindow: 'Privévenster: alles is weg als je dit venster sluit.',
        safariEviction: 'Safari wist dit als je de site 7 dagen niet opent.',
        storageNearlyFull: 'De opslag van je browser is bijna vol.',
        storageFull: 'Niet opgeslagen: de opslag van je browser is vol.',
        saveFailed: 'Niet opgeslagen: je browser laat opslaan niet toe.',
    },
    settings: {
        language: (languageName, n) =>
            n === 0
                ? `Taal naar ${languageName}: de standaardteksten worden ${languageName === 'English' ? 'Engels' : 'Nederlands'}.`
                : `Taal naar ${languageName}: ${n === 1 ? 'je 1 eigen straatnaam blijft' : `je ${n} eigen straatnamen blijven`}, de standaardteksten worden ${languageName === 'English' ? 'Engels' : 'Nederlands'}.`,
        theme: (themeName, layoutName, n) =>
            n === 0
                ? `Thema naar ${themeName}: al je lay-outs bestaan ook in dit thema.`
                : `Thema naar ${themeName}: lay-outs die ${themeName} niet heeft, worden "${layoutName}".`,
        partOff: (part, n) => {
            const name = nlPartLower[part];
            const label = `${name.charAt(0).toUpperCase()}${name.slice(1)} overslaan`;
            if (n === 0) return `${label}: je kunt het later weer aanzetten.`;
            const unit = nlPartUnit[part];
            return n === 1
                ? `${label}: je 1 aangepaste ${unit[0]} blijft bewaard en komt terug als je het weer aanzet.`
                : `${label}: je ${n} aangepaste ${unit[1]} blijven bewaard en komen terug als je het weer aanzet.`;
        },
        partOn: (part, n) => {
            const name = nlPartLower[part];
            const label = `${name.charAt(0).toUpperCase()}${name.slice(1)} weer aan`;
            if (n === 0) return `${label}.`;
            const unit = nlPartUnit[part];
            return n === 1
                ? `${label}: je 1 aangepaste ${unit[0]} is terug.`
                : `${label}: je ${n} aangepaste ${unit[1]} zijn terug.`;
        },
        boardProfile: (photos) =>
            photos === 0
                ? 'Andere bordmaat: het proefvel opnieuw printen.'
                : "Andere bordmaat: foto's blijven op hun plek; het proefvel opnieuw printen.",
    },
    summary: {
        suffix: 'aangepast',
        and: ' en ',
        space: (name) => name,
        spaces: (n) => `${n} vakken`,
        deeds: (n) => (n === 1 ? '1 eigendomsbewijs' : `${n} eigendomsbewijzen`),
        cards: (n) => (n === 1 ? '1 kaart' : `${n} kaarten`),
        notes: (n) => (n === 1 ? '1 biljet' : `${n} biljetten`),
        pawns: (n) => (n === 1 ? '1 pion' : `${n} pionnen`),
        boxLid: 'Doosdeksel',
        boardCenter: 'Bordmidden',
        houseRules: 'Huisregels',
        cardBacks: 'Kaartachterkanten',
        settings: 'Instellingen',
    },
    conflict: { thisWindow: 'Dit venster', otherWindow: 'Ander venster' },
    sync: {
        title: (n, userName) =>
            `${userName === undefined ? '' : `Welkom, ${userName}. `}${n === 1 ? 'Je hebt 1 editie in deze browser.' : `Je hebt ${n} edities in deze browser.`}`,
        body: (n) =>
            `Wil je ${n === 1 ? 'hem' : 'ze'} in je account bewaren? Dan zie je ${n === 1 ? 'hem' : 'ze'} op elk apparaat waar je inlogt, ook als je deze browser leegmaakt.`,
        accept: 'Bewaren in mijn account',
        decline: 'Nu niet',
        overLimit: (limit) => `In een account passen ${limit} edities. Kies welke je bewaart.`,
    },
};

const nlPartLower: Record<PartId, string> = {
    board: 'bord',
    deeds: 'eigendomsbewijzen',
    cards: 'Kans en Algemeen Fonds',
    money: 'speelgeld',
    pawns: 'pionnen',
    boxLid: 'doosdeksel',
    houseRules: 'huisregels',
};

/** Singular and plural of what is counted per part. */
const nlPartUnit: Record<PartId, [string, string]> = {
    board: ['vak', 'vakken'],
    deeds: ['eigendomsbewijs', 'eigendomsbewijzen'],
    cards: ['kaart', 'kaarten'],
    money: ['biljet', 'biljetten'],
    pawns: ['pion', 'pionnen'],
    boxLid: ['aanpassing', 'aanpassingen'],
    houseRules: ['aanpassing', 'aanpassingen'],
};

const enPartLower: Record<PartId, string> = {
    board: 'board',
    deeds: 'title deeds',
    cards: 'Chance and Community Chest',
    money: 'play money',
    pawns: 'pawns',
    boxLid: 'box lid',
    houseRules: 'house rules',
};

const enPartUnit: Record<PartId, [string, string]> = {
    board: ['space', 'spaces'],
    deeds: ['title deed', 'title deeds'],
    cards: ['card', 'cards'],
    money: ['note', 'notes'],
    pawns: ['pawn', 'pawns'],
    boxLid: ['change', 'changes'],
    houseRules: ['change', 'changes'],
};

const en: Messages = {
    pawnName: (n) => `Pawn ${n}`,
    loginAction: 'Sign in with Google',
    languageName: { nl: 'Nederlands', en: 'English' },
    themeName: { classic: 'Classic', riso: 'Riso', strak: 'Sleek' },
    layoutFrame: 'Photo in frame',
    partName: {
        board: 'Board',
        deeds: 'Title deeds',
        cards: 'Chance and Community Chest',
        money: 'Play money',
        pawns: 'Pawns',
        boxLid: 'Box lid',
        houseRules: 'House rules',
    },
    save: {
        saving: 'Saving…',
        savedLocal: 'Only in this browser',
        savedAccount: 'Saved to your account',
        offline: "Offline: only in this browser. It goes to your account when you're back online.",
        privateWindow: 'Private window: everything is gone when you close this window.',
        safariEviction: "Safari clears this if you don't open the site for 7 days.",
        storageNearlyFull: 'Your browser storage is almost full.',
        storageFull: 'Not saved: your browser storage is full.',
        saveFailed: 'Not saved: your browser does not allow storing data.',
    },
    settings: {
        language: (languageName, n) =>
            n === 0
                ? `Language to ${languageName}: the default texts become ${languageName === 'English' ? 'English' : 'Dutch'}.`
                : `Language to ${languageName}: your ${n === 1 ? '1 own street name stays' : `${n} own street names stay`}, the default texts become ${languageName === 'English' ? 'English' : 'Dutch'}.`,
        theme: (themeName, layoutName, n) =>
            n === 0
                ? `Theme to ${themeName}: all your layouts exist in this theme too.`
                : `Theme to ${themeName}: layouts that ${themeName} doesn't have become "${layoutName}".`,
        partOff: (part, n) => {
            const name = enPartLower[part];
            const label = `Skip ${name}`;
            if (n === 0) return `${label}: you can turn it back on later.`;
            const unit = enPartUnit[part];
            return n === 1
                ? `${label}: your 1 edited ${unit[0]} is kept and comes back when you turn it on again.`
                : `${label}: your ${n} edited ${unit[1]} are kept and come back when you turn it on again.`;
        },
        partOn: (part, n) => {
            const name = enPartLower[part];
            const label = `${name.charAt(0).toUpperCase()}${name.slice(1)} on again`;
            if (n === 0) return `${label}.`;
            const unit = enPartUnit[part];
            return n === 1
                ? `${label}: your 1 edited ${unit[0]} is back.`
                : `${label}: your ${n} edited ${unit[1]} are back.`;
        },
        boardProfile: (photos) =>
            photos === 0
                ? 'Different board size: print the proof sheet again.'
                : 'Different board size: photos stay in place; print the proof sheet again.',
    },
    summary: {
        suffix: 'edited',
        and: ' and ',
        space: (name) => name,
        spaces: (n) => `${n} spaces`,
        deeds: (n) => (n === 1 ? '1 title deed' : `${n} title deeds`),
        cards: (n) => (n === 1 ? '1 card' : `${n} cards`),
        notes: (n) => (n === 1 ? '1 note' : `${n} notes`),
        pawns: (n) => (n === 1 ? '1 pawn' : `${n} pawns`),
        boxLid: 'Box lid',
        boardCenter: 'Board centre',
        houseRules: 'House rules',
        cardBacks: 'Card backs',
        settings: 'Settings',
    },
    conflict: { thisWindow: 'This window', otherWindow: 'Other window' },
    sync: {
        title: (n, userName) =>
            `${userName === undefined ? '' : `Welcome, ${userName}. `}${n === 1 ? 'You have 1 edition in this browser.' : `You have ${n} editions in this browser.`}`,
        body: (n) =>
            `Do you want to keep ${n === 1 ? 'it' : 'them'} in your account? Then you'll see ${n === 1 ? 'it' : 'them'} on every device you sign in on, even if you clear this browser.`,
        accept: 'Keep in my account',
        decline: 'Not now',
        overLimit: (limit) => `An account holds ${limit} editions. Choose which ones to keep.`,
    },
};

export const messages: Readonly<Record<Locale, Messages>> = { nl, en };
