import { describe, expect, it } from 'vitest';

import {
    EMPTY_TEMPLATE,
    KNOWN_TEMPLATE_IDS,
    isOfferedTemplate,
    isTemplateId,
} from './edition-template-ids';

describe('template ids', () => {
    it('offers the templates on Nieuwe editie, not the hidden ones or Leeg', () => {
        expect(isOfferedTemplate('village')).toBe(true);
        expect(isOfferedTemplate('club1')).toBe(false);
        expect(isOfferedTemplate(EMPTY_TEMPLATE)).toBe(false);
    });

    it('knows every template an edition can carry, and nothing else', () => {
        expect(KNOWN_TEMPLATE_IDS).toContain(EMPTY_TEMPLATE);
        expect(KNOWN_TEMPLATE_IDS.every(isTemplateId)).toBe(true);
        expect(isTemplateId('club1')).toBe(true);
        expect(isTemplateId('neon')).toBe(false);
        expect(isTemplateId(7)).toBe(false);
    });
});
