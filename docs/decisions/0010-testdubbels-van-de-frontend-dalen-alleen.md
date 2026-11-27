# De testdubbels van de frontend dalen alleen

Status: voorgesteld in stap 9 (punt 2 van de derde audit in `docs/archive/zero-debt-plan.md`); de eigenaar keurt goed bij de merge.

## Context

De rij `test-doubles` telt de mocks van de backend. De frontend had geen telling: 29 `vi.mock` van eigen modules, 53 `vi.spyOn` en 54 `vi.stubGlobal`, samen 136. Dezelfde nep van `@/lib/echo` en van `@/features/edition/editor/ingest` stond met de hand in elk negen testbestanden.

## Besluit

- De rij `frontend-test-doubles` in `scripts/ci-ratchets.sh` telt in `resources/js` elke `vi.mock` en `vi.doMock` van een eigen module (`@/` of een relatief pad), elke `vi.spyOn` en elke `vi.stubGlobal`. Een mock van een pakket uit `node_modules` (`heic-to`, `@bugsnag/js`) telt niet; die van `@inertiajs/` telt `frontend-inertia-mocks`.
- De nep van `@/lib/echo` en van de foto-ingest staat één keer in `resources/js/testing/setup.ts`, met `fakeEcho` in `resources/js/testing/echo.ts` en `fakeIngest` in `resources/js/testing/ingest.ts`. De nep van de ingest roept standaard de echte functie aan; een test zet zelf een antwoord.
- De rij staat daarmee op 120. Het is een `max`-rij in `SHRINK_ONLY` van `scripts/debt-dashboard.sh`: ze mag dalen en nooit stijgen. Een doel van 0 heeft ze niet, want een test van een deur (storage, `fetch`, `matchMedia`) heeft een dubbel nodig.

## Gevolgen

Een nieuwe `vi.mock` van een eigen module, `vi.spyOn` of `vi.stubGlobal` laat de rij stijgen en de build falen. Wie er toch een nodig heeft, haalt er eerst een andere weg, gebruikt een gedeelde fake uit `resources/js/testing/`, of zet `[ratchet: frontend-test-doubles] <reden>` in de commit en schrijft hier een aanvulling.
