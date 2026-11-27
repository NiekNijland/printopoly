import { is, oneOf } from '@/lib/parse';
/**
 * The templates a new edition can start from (B127, B201), in display order. Leeg (the standard edition) comes
 * first on screen and is no template. Their data is in `resources/js/lib/render/edition-templates.ts`.
 */
export const TEMPLATE_IDS = [
    'village',
    'family',
    'friends',
    'party',
    'wedding',
    'group',
] as const;

/**
 * Templates nobody starts from any more (B201), kept as the baseline of editions that started from them (B152), so
 * their untouched texts stay as they are and count as no change. The first six were on offer until round 5; `club1`
 * and `birthday1` are the versions of Club of vereniging and Verjaardag from before they were rewritten (B193).
 */
const HIDDEN_TEMPLATE_IDS = [
    'company',
    'school',
    'club',
    'bachelor',
    'birthday',
    'kidsparty',
    'club1',
    'birthday1',
] as const;

/**
 * The start Leeg (B259): no template, but the standard edition with empty names and card texts. The edition keeps
 * it as its template, so its baseline is that empty edition and an untouched Leeg shows no change dots.
 */
export const EMPTY_TEMPLATE = 'empty';

export type TemplateId =
    | (typeof TEMPLATE_IDS)[number]
    | (typeof HIDDEN_TEMPLATE_IDS)[number]
    | typeof EMPTY_TEMPLATE;

/** Every template an edition can carry: the ones on offer, the hidden ones and Leeg. */
export const KNOWN_TEMPLATE_IDS: readonly TemplateId[] = [
    ...TEMPLATE_IDS,
    ...HIDDEN_TEMPLATE_IDS,
    EMPTY_TEMPLATE,
];

/** Whether a new edition can start from this template: one of the seven starts on Nieuwe editie (B201). */
const offeredTemplate = oneOf(TEMPLATE_IDS);

export const isOfferedTemplate = (value: unknown) => is(offeredTemplate, value);

const templateId = oneOf(KNOWN_TEMPLATE_IDS);

export const isTemplateId = (value: unknown) => is(templateId, value);
