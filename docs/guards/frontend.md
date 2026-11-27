# Guard: frontend

De linter houdt de regels van de frontend vast; `eslint.config.js` is de guard. De lokale regels, de selectors en de lijsten staan in `eslint-rules/`, elke regel met een RuleTester-suite ernaast (`eslint-rules/<naam>.test.js`) die een falend en een passend voorbeeld per schrijfwijze heeft.

| Rule id | De gids zegt | In plaats daarvan |
| --- | --- | --- |
| settled-rules | elke regel waar de boom op nul staat, staat bij naam op `error` in `settledCoreRules`, `settledTypedRules`, `settledReactRules`, `settledImportRules` of `settledTestRules` | een regel die op nul komt, gaat in zijn groep |
| type-escapes | geen `as`, geen `as unknown as`, geen `!`, geen `any` | vernauw met een type guard, `satisfies` of een getypte fake (`vi.fn<Fn>()`; `stubFetch` en `requestOf` uit `resources/js/testing/fetch.ts`, `mediaQueryList` uit `resources/js/testing/media-query.ts`) |
| size | een bestand telt hoogstens 400 regels, een functie en een test hoogstens 80 (lege regels en commentaar niet meegeteld); een `describe` telt niet | splits naar gedrag |
| one-way | een component en een hook zijn een const arrow; geen `forwardRef`, geen `enum`, geen re-export | `const X = ({ a }: Props) => ...` |
| file-names | bestands- en mapnamen in kebab-case, geen `index`-barrel (een pagina mag `index` heten) | importeer de module die de naam definieert |
| page-props | een pagina neemt haar props als parameters | `({ a, b }: Props) => ...` |
| doors | storage, `matchMedia`, `fetch`, window- en document-events, `Intl`, de klok en toeval hebben elk één deur | `lib/browser-storage`, `lib/media-query` (een component: `hooks/use-media-query`), `lib/dom-events`, `lib/number-format`, `lib/datetime`; `fetch` in `lib/http`, de getypte deuren `lib/render/print-api.ts` en `features/edition/remote`, en de teller `lib/feature-count`; de console alleen via `logWarning` in `lib/bugsnag`; `Date.now`, `new Date()`, `Math.random`, `performance.now` en `crypto.randomUUID` via `now` en `randomId` in `lib/clock` (een test verzet de klok met `vi.useFakeTimers`) |
| navigation | geen schrijven naar `location`, geen zelfgebouwde downloadlink, geen succes-toast van de client, geen laadstatus in `onStart`/`onFinish` | `router.visit`, de ene downloadhelper, een flash van de server |
| tests | geen focused, skipped of todo-test, geen snapshot, geen wachten op echte tijd, geen eigen `vi.mock` van `@inertiajs` | de gedeelde fake uit de test set-up: `setPage` en `visit` uit `resources/js/testing/inertia.tsx`; `waitFor`, `settle` uit `resources/js/testing/edition-test-utils.ts` of `vi.useFakeTimers` |

## Layers

Een bestand importeert alleen uit zijn eigen laag en de lagen eronder. `render` (`components/render` en `lib/render`) is de gedeelde laag onder features (D-16), met een eigen rij in `layerTable`; daar staat ook het spelmodel dat meer dan één feature leest.

| Laag (map) | Mag importeren |
| --- | --- |
| `types` | niets van het project |
| `lib` | `types`, `lib` |
| `hooks` | `lib`, `types` |
| `components/ui` | `lib`, `types`, `components/ui` |
| `components` | de vier hierboven |
| `render` | de vijf hierboven |
| `features/<domain>` | de lagen hierboven; nooit een andere feature |
| `layouts` | alles hierboven |
| `pages` | alles hierboven; nooit een andere pagina |

`layers/final-folder` faalt op een bestand buiten deze mappen (zoals `lib/<domain>` of `components/<domain>`); de entrybestanden `app.tsx`, `ssr.tsx` en `print.tsx` met hun tests, en `testing/`, zijn vrij. De features zijn `edition` (de editor, Mijn edities, de boxen, de foto's), `print` en `landing`.

## Getelde lijsten

Een overtreding wordt opgelost, niet weggezet: er is geen `eslint-suppressions.json` en geen disable-comment. De ratchetrij `lint-suppressions` staat op nul en faalt zodra dat bestand terugkomt (`eslint --suppress-all`); `frontend-functions-over-limit` telt daarin de regel voor functielengte. `frontend-inertia-mocks` telt elke `vi.mock` van `@inertiajs/` buiten de gedeelde fake in `resources/js/testing/setup.ts`. `lint-doors` telt de deuren in `doorFiles` van `eslint-rules/doors.js` (12); `lint-max-file-lines` en `lint-max-function-lines` lezen de grenzen 400 en 80 uit `eslint-rules/limits.js`. De drie mogen alleen dalen (`docs/decisions/0008-deuren-en-grenzen-van-de-linter-dalen-alleen.md`). ESLint slaat over wat git negeert (de regels van `.gitignore`) en de ontwerpprototypes in `docs/design`, verder niets; `lint-config-ignores` telt de namen die met de hand in die lijst staan. Typeassertions, `!`, `as unknown as` en imports over de lagen staan op nul en de lintregel houdt ze daar. Dode code: knip met alleen de echte entrypoints en nul bevindingen. `npm run knip:production` draait knip zonder de tests en de `testing`-mappen: een export die alleen een test gebruikt, faalt daar. Maak hem privé en test via de publieke functie, of zet een testhelper in `testing/`. `unused-ignore` telt de dependencies die knip negeert. Binaries negeert knip niet: de npm-scripts `dev:all` en `dev:all:ssr` starten `./artisan`, niet `php`.

Review controleert, de guard niet: of een hook geen domein kent, en of een component met veel logica een hook had moeten zijn (rubric item 17).
