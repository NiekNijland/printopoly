import type { Router } from '@inertiajs/core';
import type * as InertiaReact from '@inertiajs/react';
import type createServer from '@inertiajs/react/server';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

import { fakePage } from '@/testing/page-props';
import type { FakePage } from '@/testing/page-props';

type VisitTarget = Parameters<Router['visit']>[0];

const state: { page: FakePage } = { page: fakePage() };

export const setPage = (page: FakePage): void => {
    state.page = page;
};

/** Every router.visit of the test, recorded and never sent (router.get, post and reload go through it too). */
export const visit = vi.fn<(href: VisitTarget, options?: unknown) => void>();

const Head = ({ children }: { children?: ReactNode }) => <>{children}</>;

/**
 * The one fake of @inertiajs/react, wired in the test set-up: usePage() reads setPage(), Head renders its children (React
 * hoists title, meta and link) and router.visit is `visit`; the rest is the real module.
 */
export const fakeInertia = (actual: typeof InertiaReact) => {
    actual.router.visit = (...args) => visit(...args);

    return { ...actual, usePage: () => state.page, Head };
};

type SsrRender = Parameters<typeof createServer>[0];

const ssr: { render: SsrRender | null } = { render: null };

/** The fake of @inertiajs/react/server: the SSR entry hands its render callback over instead of starting a server. */
export const fakeCreateServer: typeof createServer = (render) => {
    ssr.render = render;

    return render;
};

export const ssrRender = (): SsrRender => {
    if (ssr.render === null) {
        throw new Error('The SSR entry was not imported in this test.');
    }

    return ssr.render;
};
