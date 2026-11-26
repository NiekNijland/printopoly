# Frontend

Elke taak heeft één manier, en die staat hier: kopieer dit bestand, niet de code ernaast. `eslint.config.js` is de guard `frontend`; de woorden die hij vastpint staan in `docs/guards/frontend.md`.

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
- Een bestand telt hoogstens 400 regels, een functie buiten de tests hoogstens 80 (lege regels en commentaar niet meegeteld).
- Geen `as`, geen `as unknown as`, geen `!`, geen `any`. Vernauw met een type guard of `satisfies`; een test gebruikt een getypte fake (`vi.fn<Fn>()`).
- Elke regel waar de boom op nul staat, staat bij naam op `error` in `settledCoreRules`, `settledTypedRules`, `settledReactRules`, `settledImportRules` of `settledTestRules`.

## Eén manier per taak

- Storage, `matchMedia`, `fetch`, window- en document-events en `Intl` hebben elk één deur. De lijst `doors` in `eslint.config.js` noemt per API het bestand dat haar mag aanraken; `resources/js/hooks/use-media-query.ts` is de deur voor `matchMedia`.
- Een verzoek naar de server gaat via de HTTP-hook van Inertia. De uitzondering is de getypte `fetch` voor de offline sync en de print-API (D-16, Q-16): alleen `resources/js/features/edition/remote` en `resources/js/lib/render/print-api.ts` doen dat.
- Geen schrijven naar `location`, geen zelfgebouwde downloadlink, geen succes-toast van de client, geen laadstatus in `onStart`/`onFinish`. Navigeren gaat met `router.visit`, een succes meldt de server met een flash.
- Een test staat naast zijn bestand (`<file>.test.tsx`). Geen focused, skipped of todo-test, geen snapshot, geen eigen `vi.mock` van `@inertiajs`: de gedeelde fake komt uit `resources/js/testing/setup.ts`.

Review controleert, de guard niet: of een hook geen domein kent, en of een component met veel logica een hook had moeten zijn (rubric item 17).
