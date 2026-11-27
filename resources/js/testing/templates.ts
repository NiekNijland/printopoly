import { spaceToken } from '@/lib/render/edition-card-text';
import {
    EMPTY_TEMPLATE,
    isOfferedTemplate,
    KNOWN_TEMPLATE_IDS,
} from '@/lib/render/edition-template-ids';

export const HIDDEN_TEMPLATE_IDS = KNOWN_TEMPLATE_IDS.filter(
    (id) => !isOfferedTemplate(id) && id !== EMPTY_TEMPLATE,
);

export const withSpaceTokens = (text: string): string =>
    text.replace(/\{(\d+)\}/g, (_whole, position: string) =>
        spaceToken(Number(position)),
    );
