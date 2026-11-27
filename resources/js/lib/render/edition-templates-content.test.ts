import { describe, expect, it } from 'vitest';
import { runChecks } from '@/lib/render/checks';
import { updateElement } from '@/lib/render/edition-changes';
import { resolveEdition } from '@/lib/render/edition-resolve';
import {
    isOfferedTemplate,
    TEMPLATE_IDS,
} from '@/lib/render/edition-template-ids';
import { DEFAULT_PARTS } from '@/lib/render/edition-types';
import { buildCheckInput } from '@/lib/render/editor-checks-input';
import { editorView } from '@/lib/render/editor-print-selection';
import { defined } from '@/testing/defined';
import { HIDDEN_TEMPLATE_IDS } from '@/testing/templates';
import type { Locale } from '@/types/game';
import {
    lidExample,
    template,
    templateEdition,
    templateInvitation,
    templates,
    type TemplateId,
} from './edition-templates';

const LOCALES: readonly Locale[] = ['nl', 'en'];

/** Every text of a template in one string: names, cards, house rules. */
const allText = (id: TemplateId, locale: Locale): string => {
    const data = template(id, locale);

    return [
        ...Object.values(data?.spaces ?? {}),
        ...(data?.chance ?? []).map((card) => card.text),
        ...(data?.chest ?? []).map((card) => card.text),
        ...(data?.houseRules ?? []),
        data?.name ?? '',
    ].join(' | ');
};

describe('the content of the templates on offer (R5-17)', () => {
    describe.each(LOCALES)('%s', (locale) => {
        it.each([...TEMPLATE_IDS])(
            'makes %s without a single message in Nog even nakijken',
            (id) => {
                const edition = defined(templateEdition(id, locale));
                const issues = runChecks(
                    buildCheckInput(edition, new Map(), new Map()),
                );

                expect(
                    issues.map(
                        (issue) =>
                            `${issue.elementKey}: ${issue.message[locale]}`,
                    ),
                ).toEqual([]);
            },
        );

        it.each([...TEMPLATE_IDS])(
            'never sends a card of %s to a space with the name the card already says',
            (id) => {
                const data = defined(template(id, locale));
                const article = /^(?:de|het|een|the|a|an)\s+/i;
                const echoes = [...data.chance, ...data.chest].flatMap((card) =>
                    [...card.text.matchAll(/\{(\d+)\}/g)].flatMap((match) => {
                        const name = data.spaces[match[1] ?? ''];
                        const rest = card.text
                            .replace(match[0], ' ')
                            .toLowerCase();

                        return name !== undefined &&
                            rest.includes(
                                name.replace(article, '').toLowerCase(),
                            )
                            ? [`${card.text} (${name})`]
                            : [];
                    }),
                );

                // "De trouwauto staat klaar bij De trouwauto" (Sem).
                expect(echoes).toEqual([]);
            },
        );
    });

    it.each(LOCALES)(
        'keeps Groep fit for a school class and a club: no coffee, office or drinks (%s)',
        (locale) => {
            expect(allText('group', locale)).not.toMatch(
                /koffie|laptop|printer|beantwoorden|drinken|bier|wijn|coffee|reply all|drinks|beer|wine/i,
            );
        },
    );

    it('names the tasting at the wedding without a slip of the pen (Sem)', () => {
        expect(allText('wedding', 'nl')).not.toMatch(/proefproeverij/i);
    });
});

describe('templates that fit the group (B186)', () => {
    it.each(LOCALES)(
        'makes "Club of vereniging" fit a choir, scouting or church as well as a sports club (%s)',
        (locale) => {
            expect(allText('club', locale)).not.toMatch(
                /voetbal|wedstrijd|veld|tribune|scheidsrechter|supporter|bestuur|clubhuis|kantine|bond|sponsor|kleedkamer|training|football|match|pitch|stand\b|referee|supporters|committee|clubhouse|canteen|league|sponsor|changing room/i,
            );
        },
    );

    it.each(LOCALES)(
        'keeps Kinderfeest playful and safe for children (%s)',
        (locale) => {
            expect(allText('kidsparty', locale)).not.toMatch(
                /bier|wijn|champagne|borrel|kroeg|rondje|alcohol|beer|wine|pub\b|drinks|a round|bar\b|kater|hangover|boete|fine\b|politie|police|agent/i,
            );
            expect(allText('birthday', locale)).not.toMatch(
                /zijwieltjes|stabilisers|schoolbus|school bus|snoepgeld|sweet money/i,
            );
        },
    );

    it.each(['party', 'wedding', 'birthday', 'kidsparty'] as const)(
        'gives %s an invitation with a kicker of its own, in the same set as every edition (B225)',
        (id) => {
            for (const locale of LOCALES) {
                const edition = defined(templateEdition(id, locale));
                // The editor shows every part (B198), the invitation too.
                const invitation = resolveEdition(
                    editorView(edition),
                ).invitation;

                expect(edition.parts).toEqual({
                    ...DEFAULT_PARTS,
                    houseRules: true,
                });
                expect(invitation?.subtitle).toBe(
                    template(id, locale)?.invitation?.kicker,
                );
                expect(invitation?.subtitle).not.toMatch(
                    /Spelavond|Game night/,
                );
            }
        },
    );

    it('lets the owner write over the kicker and headline of the template, or hide the kicker', () => {
        const edition = editorView(defined(templateEdition('kidsparty', 'nl')));
        const own = updateElement(edition, 'invitation', {
            subtitle: 'Lotte 8',
            name: 'Feest!',
        }).edition;
        const hidden = updateElement(edition, 'invitation', {
            subtitle: '',
        }).edition;

        expect(resolveEdition(edition).invitation).toMatchObject({
            subtitle: 'Kinderfeestje',
            name: 'Kom je op mijn feestje?',
        });
        expect(resolveEdition(own).invitation).toMatchObject({
            subtitle: 'Lotte 8',
            name: 'Feest!',
        });
        expect(resolveEdition(hidden).invitation?.subtitle).toBe('');
        expect(templateInvitation(null, 'nl')).toEqual({});
    });

    it('offers the six templates after Leeg and never the hidden ones (B201)', () => {
        expect(templates('nl').map((item) => item.label)).toEqual([
            'Dorp of wijk',
            'Familie',
            'Vrienden',
            'Feest',
            'Bruiloft',
            'Groep',
        ]);
        expect(templates('en').map((item) => item.label)).toEqual([
            'Village or neighbourhood',
            'Family',
            'Friends',
            'Party',
            'Wedding',
            'Group',
        ]);
        for (const id of HIDDEN_TEMPLATE_IDS) {
            expect(isOfferedTemplate(id)).toBe(false);
            for (const locale of LOCALES) {
                expect(template(id, locale)?.label).toBeTruthy();
            }
        }
        expect(template('club1', 'nl')?.label).toBe('Club of vereniging');
    });

    it.each(LOCALES)(
        'says in Vrienden that it fits a student house too (%s)',
        (locale) => {
            expect(template('friends', locale)?.tagline).toMatch(
                /studentenhuis|student house/,
            );
        },
    );

    it.each(LOCALES)(
        'keeps Feest playful for children and fine for adults (%s)',
        (locale) => {
            expect(allText('party', locale)).not.toMatch(
                /bier|wijn|champagne|borrel|kroeg|rondje|alcohol|beer|wine|pub\b|drinks|a round|bar\b|kater|hangover|boete|fine\b|politie|police|zijwieltjes|stabilisers|schoolbus|school bus|kleuter|toddler/i,
            );
            expect(template('party', locale)?.tagline).toMatch(
                /verjaardag|birthday/i,
            );
            expect(template('party', locale)?.tagline).toMatch(
                /kinderfeest|kids' party/i,
            );
        },
    );

    it.each(LOCALES)(
        'keeps Groep neutral, so a club, a school, a company and a team all fit (%s)',
        (locale) => {
            expect(allText('group', locale)).not.toMatch(
                /voetbal|wedstrijd|scheidsrechter|kantine|training|klas\b|lokaal|leraar|juf\b|meester|baas|manager|salaris|bonus|kerk|koor|football|match|referee|canteen|classroom|teacher|boss|salary|church|choir/i,
            );
        },
    );

    it('gives the box lid an example that follows the template, not Christmas for everyone (bug 25)', () => {
        expect(lidExample('wedding', 'nl')).toContain('Eva en Tim');
        expect(lidExample('club', 'en')).not.toMatch(/christmas/i);
        expect(lidExample(null, 'nl')).toBeUndefined();
        expect(lidExample('club1', 'nl')).toBeUndefined();
    });
});
