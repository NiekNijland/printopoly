# Guard: frontend

De linter houdt de regels van de frontend vast; `eslint.config.js` is de guard, met kleine lokale regels waar een selector tekortschiet.

| Rule id | De gids zegt | In plaats daarvan |
| --- | --- | --- |
| settled-rules | elke regel waar de boom op nul staat, staat bij naam op `error` in `settledCoreRules`, `settledTypedRules`, `settledReactRules`, `settledImportRules` of `settledTestRules` | een regel die op nul komt, gaat in zijn groep |
| type-escapes | geen `as`, geen `as unknown as`, geen `!`, geen `any` | vernauw met een type guard, `satisfies` of een getypte fake (`vi.fn<Fn>()`) |
| size | een bestand telt hoogstens 400 regels, een functie buiten de tests hoogstens 80 (lege regels en commentaar niet meegeteld) | splits naar gedrag |
| one-way | een component en een hook zijn een const arrow; geen `forwardRef`, geen `enum`, geen re-export | `const X = ({ a }: Props) => ...` |
| file-names | bestands- en mapnamen in kebab-case, geen `index`-barrel (een pagina mag `index` heten) | importeer de module die de naam definieert |
| page-props | een pagina neemt haar props als parameters | `({ a, b }: Props) => ...` |
| doors | storage, `matchMedia`, `fetch`, window- en document-events en `Intl` hebben elk één deur | `hooks/use-media-query`; `fetch` alleen in `lib/print/api.ts` en `lib/edition/remote` |
| navigation | geen schrijven naar `location`, geen zelfgebouwde downloadlink, geen succes-toast van de client, geen laadstatus in `onStart`/`onFinish` | `router.visit`, de ene downloadhelper, een flash van de server |
| tests | geen focused, skipped of todo-test, geen snapshot, geen eigen `vi.mock` van `@inertiajs` | de gedeelde fake uit de test set-up |

## Layers

Een bestand importeert alleen uit zijn eigen laag en de lagen eronder. `render` (`components/render` en `lib/render`) is de gedeelde laag onder features (D-16).

| Laag (map) | Mag importeren |
| --- | --- |
| `types` | niets van het project |
| `lib` | `types`, `lib` |
| `hooks` | `lib`, `types` |
| `components/ui` | `lib`, `types`, `components/ui` |
| `components` | de vier hierboven |
| `features/<domain>` | de lagen hierboven; nooit een andere feature |
| `layouts` | alles hierboven |
| `pages` | alles hierboven; nooit een andere pagina |

`layers/final-folder` faalt op een bestand buiten deze mappen (`lib/<domain>`, `components/<domain>`, `data`, `print`); de entrybestanden `app.tsx`, `ssr.tsx`, `print.tsx` en `testing/` zijn vrij.

## Getelde lijsten

De overtredingen van vandaag staan in `eslint-suppressions.json` (`eslint --suppress-all`), nooit in een disable-comment. Ratchet-rijen: `lint-suppressions` (alles), `frontend-functions-over-limit`, `frontend-type-assertions`, `frontend-non-null-assertions`, `frontend-layer-imports`, `frontend-sibling-imports`, `frontend-layout` (per regel), `frontend-double-assertions` en `frontend-inertia-mocks` (tekst). Dode code: knip met alleen de echte entrypoints, de bevindingen in `baselines/unused-code.txt` via `scripts/keyed-baseline.sh --format knip`, geteld door `keyed-baselines`; de ignore-lijsten van knip door `unused-ignore` en `unused-ignore-binaries`.

Review controleert, de guard niet: of een hook geen domein kent, en of een component met veel logica een hook had moeten zijn (rubric item 17).
