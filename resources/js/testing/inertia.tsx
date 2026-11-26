import type { Router } from '@inertiajs/core';
import type * as InertiaReact from '@inertiajs/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

import { fakePage } from '@/testing/page-props';
import type { FakePage } from '@/testing/page-props';

type VisitTarget = Parameters<Router['visit']>[0];

const state: { page: FakePage } = { page: fakePage() };

/** Sets what usePage() returns until the end of the test; the set-up starts every test with fakePage(). */
export const setPage = (page: FakePage): void => {
    state.page = page;
};

/** Every router.visit of the test, recorded and never sent (router.get, post and reload go through it too). */
export const visit = vi.fn<(href: VisitTarget, options?: unknown) => void>();

const Head = ({ children }: { children?: ReactNode }) => <>{children}</>;

/**
 * The one fake of @inertiajs/react, wired in the test set-up: the real module, with usePage() reading the page of
 * setPage(), a Head that renders its children (React puts title, meta and link in the document head) and the real
 * router with `visit` as its visit. The set-up clears `visit` before each test.
 */
export const fakeInertia = (actual: typeof InertiaReact) => {
    actual.router.visit = (...args) => visit(...args);

    return { ...actual, usePage: () => state.page, Head };
};
