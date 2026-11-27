import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
    ContactScene,
    EditionScene,
    FaqScene,
    PrintgidsScene,
    PrivacyScene,
    TermsScene,
} from './table-page-scenes';

describe('the scenes at the top of the public pages', () => {
    it('lays the things of each page on the table', () => {
        const items = (node: React.ReactElement) =>
            render(node).container.childElementCount;

        expect(items(<PrintgidsScene />)).toBe(5);
        expect(items(<FaqScene />)).toBe(4);
        for (const scene of [
            <PrivacyScene key="p" />,
            <TermsScene key="t" />,
            <EditionScene key="e" />,
            <ContactScene key="c" />,
        ]) {
            expect(items(scene)).toBeGreaterThan(0);
        }
    });

    it('puts a question mark on the FAQ and an envelope on contact', () => {
        expect(render(<FaqScene />).container.textContent).toContain('?');
        expect(
            render(<ContactScene />).container.querySelector('svg'),
        ).not.toBeNull();
    });
});
