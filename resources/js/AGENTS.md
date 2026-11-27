# Frontend

Elke taak heeft één manier, en die staat hier: kopieer dit bestand, niet de code ernaast. `eslint.config.js` is de guard `frontend`, met zijn regels en lijsten in `eslint-rules/`; de woorden die hij vastpint staan in `docs/guards/frontend.md`.

## Lagen

Een bestand importeert alleen uit zijn eigen laag en de lagen eronder. De laagste laag staat bovenaan.

| Laag (map)          | Bevat                                                                                                                         | Mag importeren                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `types`             | types, ook de gegenereerde in `resources/js/types/generated.ts`                                                               | niets van het project                        |
| `lib`               | functies zonder React en zonder domeinstaat                                                                                   | `types`, `lib`                               |
| `hooks`             | hooks die geen domein kennen                                                                                                  | `lib`, `types`                               |
| `components/ui`     | de shadcn/ui-componenten in de huisstijl                                                                                      | `lib`, `types`, `components/ui`              |
| `components`        | gedeelde componenten                                                                                                          | de vier lagen hierboven                      |
| `render`            | de gedeelde tekenlaag met het spelmodel dat elke feature leest: `resources/js/components/render` en `resources/js/lib/render` | de lagen hierboven                           |
| `features/<domain>` | alles van één domein: `edition`, `print` en `landing`                                                                         | de lagen hierboven; nooit een andere feature |
| `layouts`           | de layouts van de pagina's                                                                                                    | alles hierboven                              |
| `pages`             | de Inertia-pagina's                                                                                                           | alles hierboven; nooit een andere pagina     |

`render` is een afwijking van de kit die Niek goedkeurde (D-16, Q-10): de editor, de print, de boxen en de pagina's tekenen het spel met dezelfde code. Het spelmodel dat `render` en meer dan één feature lezen (de editie, het bord, de opmaak van de print, de controles) staat ook in `render`, met de naam van zijn domein voor de bestandsnaam (`lib/render/edition-types.ts`, `lib/render/print-composition.ts`). Een feature mag `render` importeren; `render` importeert geen feature. `lib` en `hooks` kennen geen domein. De lintregel `layers/final-folder` faalt op een bestand buiten deze mappen.

## Bestanden en componenten

- Bestands- en mapnamen in kebab-case, geen `index`-barrel (een pagina mag `index` heten).
- Een component en een hook zijn een const arrow. Geen `forwardRef`, geen `enum`, geen re-export.
- Een pagina neemt haar props als parameters.
- Een bestand telt hoogstens 400 regels, een functie en een test hoogstens 80 (lege regels en commentaar niet meegeteld); een `describe` telt niet.
- Geen `as`, geen `as unknown as`, geen `!`, geen `any`. Vernauw met een type guard of `satisfies`; een test gebruikt een getypte fake (`vi.fn<Fn>()`).
- Elke regel waar de boom op nul staat, staat bij naam op `error` in `settledCoreRules`, `settledTypedRules`, `settledReactRules`, `settledImportRules` of `settledTestRules`.

## Eén manier per taak

- Storage, `matchMedia`, `fetch`, window- en document-events, `Intl`, de klok en toeval hebben elk één deur. De lijst `doorFiles` in `eslint-rules/doors.js` noemt de bestanden die een API mogen aanraken; `resources/js/lib/media-query.ts` is de deur voor `matchMedia` (een component leest hem met `resources/js/hooks/use-media-query.ts`), `resources/js/lib/browser-storage.ts` voor storage, `resources/js/lib/dom-events.ts` voor window- en document-events, `resources/js/lib/number-format.ts` en `resources/js/lib/datetime.ts` voor `Intl`, `resources/js/lib/clock.ts` (`now`, `randomId`) voor de klok en toeval.
- Een verzoek naar de server gaat via de HTTP-hook van Inertia. De uitzondering is de getypte `fetch` voor de offline sync en de print-API (D-16, Q-16), in `resources/js/features/edition/remote` en `resources/js/lib/render/print-api.ts`. Elk ander verzoek gaat door `sendRequest` in `resources/js/lib/http.ts`; alleen de teller in `resources/js/lib/feature-count.ts` heeft een eigen deur, zonder cookies (`docs/decisions/0003-fetch-doors.md`).
- Een fout die de pagina opvangt gaat naar `reportError` of `reportUnlessOffline` in `resources/js/lib/bugsnag.ts`; een lege `catch` of een `.catch(() => undefined)` slikt haar in. Naar de console schrijft alleen `logWarning` in hetzelfde bestand.
- Geen schrijven naar `location`, geen zelfgebouwde downloadlink, geen succes-toast van de client, geen laadstatus in `onStart`/`onFinish`. Navigeren gaat met `router.visit`, een succes meldt de server met een flash; een volledige paginalading gaat via `resources/js/lib/full-page-navigation.ts`.
- Een test staat naast zijn bestand (`<file>.test.tsx`). Geen focused, skipped of todo-test, geen snapshot, geen wachten op echte tijd, geen eigen `vi.mock` van `@inertiajs`, `@/lib/echo` of `@/features/edition/editor/ingest`: de gedeelde fake komt uit `resources/js/testing/setup.ts` (`fakeEcho` uit `resources/js/testing/echo.ts`, `fakeIngest` uit `resources/js/testing/ingest.ts`), ook die van `@inertiajs/react/server` (`ssrRender` uit `resources/js/testing/inertia.tsx` geeft de render van de SSR-entry). Een bestand met alleen types krijgt een typetest met `expectTypeOf`. In plaats van wachten op echte tijd: `waitFor` wacht op wat de test verwacht, `settle` uit `resources/js/testing/edition-test-utils.ts` laat de beloftes aflopen, `vi.useFakeTimers` verzet de klok.

Review controleert, de guard niet: of een hook geen domein kent, en of een component met veel logica een hook had moeten zijn (rubric item 17).
