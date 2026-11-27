// Each browser API has one door, so blocked storage, a missing matchMedia and a failed request behave the same
// everywhere. The file that is the door gets the same lists without its own entry (below).
export const doors = {
    localStorage: 'lib/browser-storage',
    sessionStorage: 'lib/browser-storage',
    matchMedia:
        'lib/media-query (useMediaQuery in hooks/use-media-query for a component)',
    fetch: 'lib/http (or the typed doors lib/render/print-api.ts and features/edition/remote; lib/feature-count only counts); a page request is the Inertia HTTP hook',
    XMLHttpRequest: 'features/edition/remote',
};
const doorMessage = (door) =>
    `Use ${door}: it is the one place that touches this API (docs/guards/frontend.md, Doors).`;
const domEventMessage =
    'Listen to window and document through the one helper pair in lib/dom-events, which removes what it added (docs/guards/frontend.md, Doors).';
export const consoleRule = {
    object: 'console',
    message:
        'Write to the console only through logWarning in lib/bugsnag; an error goes to reportError (docs/guards/frontend.md, Doors).',
};
const formatMessage =
    'Turn a number or date into text through lib/number-format or lib/datetime, which cache the formatter per locale (docs/guards/frontend.md, Doors).';
export const doorGlobals = (except = []) => [
    ...Object.entries(doors)
        .filter(([name]) => !except.includes(name))
        .map(([name, door]) => ({ name, message: doorMessage(door) })),
    ...(except.includes('events')
        ? []
        : ['addEventListener', 'removeEventListener'].map((name) => ({
              name,
              message: domEventMessage,
          }))),
];
export const doorProperties = (except = []) => [
    ...(except.includes('console') ? [] : [consoleRule]),
    ...(except.includes('events')
        ? []
        : ['addEventListener', 'removeEventListener'].flatMap((property) =>
              ['window', 'document', 'globalThis'].map((object) => ({
                  object,
                  property,
                  message: domEventMessage,
              })),
          )),
    ...Object.entries(doors)
        .filter(([name]) => !except.includes(name))
        .flatMap(([property, door]) =>
            ['window', 'globalThis'].map((object) => ({
                object,
                property,
                message: doorMessage(door),
            })),
        ),
    ...['NumberFormat', 'DateTimeFormat', 'RelativeTimeFormat']
        .filter((property) => !except.includes(property))
        .map((property) => ({
            object: 'Intl',
            property,
            message: formatMessage,
        })),
    ...['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'].map(
        (property) => ({ property, message: formatMessage }),
    ),
];
// Components and pages visit with router.visit; a list that filters through the URL has one hook that calls router.get.
export const queryVisitRule = {
    object: 'router',
    property: 'get',
    message:
        'Visit with router.visit; a list that filters, searches or sorts through the URL uses the one query hook in hooks (docs/guards/frontend.md, One way per task).',
};
// A function a test captured from a mock is narrowed and called, so a wrong argument fails tsc.
export const reflectApplyRule = {
    object: 'Reflect',
    property: 'apply',
    message:
        'Call the function directly: type the mock with vi.fn<Fn>() (docs/guards/frontend.md, Tests).',
};

// The files that are a door, each with the APIs it may touch. The ratchet row lint-doors counts the entries.
export const doorFiles = {
    'lib/media-query.ts': ['matchMedia'],
    'lib/browser-storage.ts': ['localStorage', 'sessionStorage'],
    'lib/bugsnag.ts': ['console'],
    'lib/dom-events.ts': ['events'],
    'lib/number-format.ts': ['NumberFormat'],
    'lib/datetime.ts': ['DateTimeFormat'],
    'lib/http.ts': ['fetch', 'XMLHttpRequest'],
    'lib/feature-count.ts': ['fetch', 'XMLHttpRequest'],
    'lib/render/print-api.ts': ['fetch', 'XMLHttpRequest'],
    'features/edition/remote/*.ts': ['fetch', 'XMLHttpRequest'],
    'lib/full-page-navigation.ts': ['location'],
};
