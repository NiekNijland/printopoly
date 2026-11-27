import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { useBrowserValue } from './use-browser-value';

const Probe = () =>
    createElement(
        'span',
        null,
        useBrowserValue(() => 'browser', 'server'),
    );

describe('useBrowserValue', () => {
    it('reads the value in the browser', () => {
        expect(
            renderHook(() => useBrowserValue(() => 'browser', 'server')).result
                .current,
        ).toBe('browser');
    });

    it('answers the server value when rendered on the server', () => {
        expect(renderToString(createElement(Probe))).toContain('server');
    });
});
