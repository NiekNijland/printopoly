# Guard: frontend

De linter houdt de regels van de frontend vast; `eslint.config.js` is de guard, met kleine lokale regels waar een selector tekortschiet.

| Rule id | De gids zegt | In plaats daarvan |
| --- | --- | --- |
| settled-rules | elke regel waar de boom op nul staat, staat bij naam op `error` in `settledCoreRules`, `settledTypedRules`, `settledReactRules`, `settledImportRules` of `settledTestRules` | een regel die op nul komt, gaat in zijn groep |
| type-escapes | geen `as`, geen `as unknown as`, geen `!`, geen `any` | vernauw met een type guard, `satisfies` of een getypte fake (`vi.fn<Fn>()`; `stubFetch` en `requestOf` uit `resources/js/testing/fetch.ts`, `mediaQueryList` uit `resources/js/testing/media-query.ts`) |
| size | een bestand telt hoogstens 400 regels, een functie buiten de tests hoogstens 80 (lege regels en commentaar niet meegeteld) | splits naar gedrag |
| one-way | een component en een hook zijn een const arrow; geen `forwardRef`, geen `enum`, geen re-export | `const X = ({ a }: Props) => ...` |
| file-names | bestands- en mapnamen in kebab-case, geen `index`-barrel (een pagina mag `index` heten) | importeer de module die de naam definieert |
| page-props | een pagina neemt haar props als parameters | `({ a, b }: Props) => ...` |
| doors | storage, `matchMedia`, `fetch`, window- en document-events en `Intl` hebben elk één deur | `lib/browser-storage`, `lib/media-query` (een component: `hooks/use-media-query`), `lib/dom-events`, `lib/number-format`, `lib/datetime`; `fetch` alleen in `lib/render/print-api.ts` en `features/edition/remote` |
| navigation | geen schrijven naar `location`, geen zelfgebouwde downloadlink, geen succes-toast van de client, geen laadstatus in `onStart`/`onFinish` | `router.visit`, de ene downloadhelper, een flash van de server |
| tests | geen focused, skipped of todo-test, geen snapshot, geen eigen `vi.mock` van `@inertiajs` | de gedeelde fake uit de test set-up: `setPage` en `visit` uit `resources/js/testing/inertia.tsx` |

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

`layers/final-folder` faalt op een bestand buiten deze mappen (zoals `lib/<domain>` of `components/<domain>`); de entrybestanden `app.tsx`, `ssr.tsx`, `print.tsx` en `testing/` zijn vrij. De features zijn `edition` (de editor, Mijn edities, de boxen, de foto's), `print` en `landing`.

## Getelde lijsten

De overtredingen van vandaag staan in `eslint-suppressions.json` (`eslint --suppress-all`), nooit in een disable-comment. Ratchet-rijen: `lint-suppressions` (alles), `frontend-functions-over-limit`, `frontend-type-assertions`, `frontend-non-null-assertions`, `frontend-layer-imports`, `frontend-sibling-imports` (per regel), `frontend-double-assertions` en `frontend-inertia-mocks` (tekst). Dode code: knip met alleen de echte entrypoints en nul bevindingen. Zijn ignore-lijsten tellen `unused-ignore` en `unused-ignore-binaries`; de enige ignore is de binary `php`, die `concurrently` start in de npm-scripts `dev:all` en `dev:all:ssr`.

Review controleert, de guard niet: of een hook geen domein kent, en of een component met veel logica een hook had moeten zijn (rubric item 17).
