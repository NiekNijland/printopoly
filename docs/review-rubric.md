# Review rubric

Wat een reviewer, mens of agent, in elke pull request controleert. De tabel One pattern in `AGENTS.md` is de maat: doet de PR een taak anders dan die tabel, dan is dat een bevinding, ook als CI groen is. De nummers zijn die van de kit en zijn in elk project gelijk; de catalogi van de kit noemen ze "rubric item N".

## Bevindingen

Blokkerend

1. De PR voegt een regel toe aan een allowlist, baseline, suppressie, skip, ignore of lijst met beredeneerde uitzonderingen. Die lijsten worden alleen korter.
2. De PR brengt een patroon samen zonder de guard die het vasthoudt, haalt een guard weg, maakt een controle niet-blokkerend, beperkt haar tot gewijzigde bestanden of verbergt haar falen. Elke wijziging aan het ratchetscript buiten het toevoegen van een rij, aan de andere scripts in `scripts/` en aan de pipelinebestanden lees je regel voor regel, met de reden van haar `[ratchet: script]`-tag.
3. Toegang per object: een id uit een ingang (een route, een componentactie, een consolecommand, een payload van een job) bereikt een record zonder binding en policy; een bestaansregel op een tabelnaam; een ruwe tabellezing; een scope die tenantdata omzeilt.
4. Een verplaatste of hernoemde klasse waarvan de naam in data staat, buiten de releases van de verplaatsing; een gewijzigde of verwijderde regel in het register van opgeslagen namen zonder alias (de guard faalt daarop) of zonder datamigratie (de guard ziet dat niet: jij controleert het).
5. Een migratie die een index of foreign key op een bestaande tabel of collectie bouwt zonder de niet-blokkerende vorm van de database.
6. Een commit met `[ratchet: <name>] <reason>` of `[ratchet: script] <reason>`: lees de reden en de diff. Een "new row" in de uitvoer van de ratchets die niet bij een guard van deze PR hoort.
7. Productie gedraagt zich na de PR anders en de beschrijving zegt dat niet onder "Gedrag dat bewust verandert": een fix die een test op het echte pad blootlegde, een gecorrigeerde opzoeksleutel.
8. Een verhoogd plafond in het plafondbestand zonder zijn tag `[ratchet: cap-<key>]`, of met een reden die niet klopt (item 6); een test die middleware of exception handling uitzet; een nieuwe double van een klasse van het project waar de echte klasse of een fake werkt.

Waarschuwingen

9. Nieuwe code doet een taak anders dan de tabel One pattern, in een deel dat geen guard beslist.
10. Autorisatie op rolnaam, of een controle in de verkeerde laag.
11. Nieuw gedrag dat geen test noemt; een test van de breekproef die groen bleef.
12. De PR verandert een teller en de beschrijving zegt niet welke en met hoeveel.
13. Een nieuwe of gewijzigde guard zonder falend voorbeeld voor elke andere schrijfwijze van zijn constructie: via een ouderklasse of een sub-interface, als functie en als methode, onder een alias of een volledige naam.
14. Een zin in een gids die zegt dat een guard op iets faalt wat de falende voorbeelden van de guard niet tonen; een zin die een overgang beschrijft; een afgerond plan dat niet gearchiveerd is.
15. Een committype dat niet bij de wijziging past.
16. Teksten en interface: een tekst die niet in beide talen klopt, een kale pagina, een losse knop naast het ontwerp, een eigen control waar shadcn/ui er een heeft, een vereenvoudigde weergave van het spel.

Oordelen (alleen review: geen guard kan dit beslissen)

17. Frontendontwerp: staat met fasen is een pure reducer over een tagged union met een eigen test; een context is gesplitst naar wat samen verandert.
18. Een test oefent de klasse die hij noemt, en de klasse die hij noemt is die waarvan hij het gedrag vaststelt.
19. Een waarde die van configuratie bij runtime afhangt, past: de timeout van een klasse in de wachtrij blijft onder de timeout van haar worker; het lock van een geplande taak verloopt hoogstens op haar interval.
20. De `down()` van een migratie maakt haar `up()` echt ongedaan; een typewijziging op een grote collectie heeft haar migratieplan in de PR.
21. De lege waarde van een gecontroleerde helper (een mislukte parse, een onverwacht type) handelt de aanroeper af; een property die een andere overschrijft, draagt dezelfde bedoeling als een methode die dat doet.
22. De reden van een `[ratchet: comments]`-override voldoet aan de regel voor commentaar: een lezer handelt later anders door het commentaar.

Suggesties

23. Een commentaar dat de code herhaalt; een nieuwe abstractie waar code weghalen genoeg is.

## Wat CI afdwingt, en wat alleen review is

Elke rij van de tabel One pattern in `AGENTS.md`, in dezelfde volgorde. De kolom Guard noemt alleen wat de falende voorbeelden van die guard tonen. Een rij zonder guard is alleen review: controleer haar met het oog.

| Rij | Guard | Alleen review |
| --- | --- | --- |
| Plek van een klasse | `ModuleLayoutArchitectureTest`, `OneModulePerDomainArchitectureTest` | item 9: of een klasse in de map staat die haar taak beschrijft, en of een klasse in `app/Support` geen domein kent |
| Controller | `ControllerNameArchitectureTest`, `ThinControllersArchitectureTest`, `MethodSizeArchitectureTest`, `FinalReadonlyArchitectureTest` | item 9: of het werkwoord past bij wat de controller doet |
| Action | `ActionNamingArchitectureTest`, `FinalReadonlyArchitectureTest` | item 9: of de naam met een werkwoord begint |
| Enum | `EnumShapeArchitectureTest` | item 9: of een waarde leesbaar is waar ze bewaard of verstuurd wordt |
| DTO voor de frontend | `DataNamingArchitectureTest`, `PureLayerArchitectureTest` | item 9: camelCase-sleutels van een array die een controller bouwt |
| Pure laag | `PureLayerArchitectureTest` | item 9: een import zonder gebruik |
| Dichte klasse | `ClosedClassArchitectureTest`; de Pint-regel `final_class` met de dashboard-rij `open-classes` | item 1: de beslisregel van een klasse die open blijft |
| Lengte van een bestand | `FileSizeArchitectureTest`; de dashboard-rijen `source-files-over-limit` en `test-files-over-limit` | item 9: of een splitsing naar gedrag gaat |
| Lengte van een methode | `MethodSizeArchitectureTest` | item 9: of een splitsing een eigen verantwoordelijkheid oplevert |
| Trait | `NoSingleUseTraitsArchitectureTest` | item 9: of een gedeelde trait beter een samenwerkende klasse is |
| Vertaalde tekst | `TranslationKeysArchitectureTest` | item 16: de tekst in elke taal |
| Verboden aanroep | PHPStan met `phpstan.neon` (`composer analyse`) | item 1: een nieuwe toegestane plek |
| Validatie | `RequestValidationArchitectureTest`, `ValidatedInputArchitectureTest`, `FormRequestArchitectureTest` | item 9: of een `authorize()` met `#[Override]` echt een controle van de ouder uitzet |
| Autorisatie | `ControllerAuthorizationArchitectureTest`, `RoutePermissionCoverageTest`, `ObjectLevelAccessCoverageTest` | item 3: de regel in de policy |
| Token-capability | `TokenCapabilityTest`, `ObjectLevelAccessCoverageTest` | item 3: een token geeft alleen toegang tot zijn eigen box of printjob |
| JSON-antwoord | `JsonEndpointArchitectureTest` | item 9: de status van een schrijvende route |
| Inertia-pagina | `InertiaPageArchitectureTest` | item 9: of de props van de controller bij de pagina passen |
| Redirect en flash | `RedirectArchitectureTest`, `FlashMessageArchitectureTest`; ESLint `toasts/no-success-toast` | item 16: de tekst van de melding |
| Route | `RouteDeclarationArchitectureTest`, `ControllerNameArchitectureTest`, `RouteRateLimitCoverageTest` | item 9: of de route bij de controller past |
| Rate limit | `RateLimiterArchitectureTest`, `RouteRateLimitCoverageTest` | item 19: de getallen in config |
| Container | `ContainerBindingArchitectureTest`; PHPStan | item 9: een binding die een interface aan een fake koppelt |
| Model | `ModelConventionArchitectureTest` | item 9: of een cast past bij wat MongoDB bewaart |
| Fout afvangen en loggen | `ErrorHandlingArchitectureTest` | item 21: of de aanroeper de lege waarde afhandelt |
| Event | `EventDispatchArchitectureTest`; PHPStan | item 9: een event dat binnen een transactie verstuurd wordt |
| Wachtrij | `QueuedWorkArchitectureTest` | item 19: of de timeout onder die van de worker blijft |
| Geplande taak | `ScheduledTaskArchitectureTest` | item 19: of het lock past bij het interval |
| Migratie en index | `MigrationClassArchitectureTest` | item 5 en item 20: de vorm van een index op een bestaande collectie, en de `down()` |
| Veel documenten lezen | `QueryLoadArchitectureTest`; de ratchetrij `cleanup-load-all` | item 9: een lus `for` of een callback die per document een query doet |
| Limiet per groep | `QuotaCountArchitectureTest`; de ratchetrij `quota-count-checks` | item 9: een limiet die op een andere manier telt dan met `count()` |
| Type vernauwen | PHPStan op level 10; `InlineVarCastArchitectureTest` | item 21: de lege waarde van een gecontroleerde helper |
| Testtier | `TestTierArchitectureTest` | item 18: de laagste eerlijke tier |
| Plek van een test | `TestLocationArchitectureTest` | item 18: of de test de klasse oefent die hij noemt |
| Testdeclaratie | `TestDeclarationArchitectureTest` | item 18: of de naam zegt wat de test bewijst |
| Assertie | `AssertionSpellingArchitectureTest` | item 11: of een assertie kan falen |
| Verboden testaanroep | `BannedTestCallArchitectureTest`; de ratchetrijen `test-doubles`, `event-fake-all` en `queue-bus-fake-all` | item 8: of een fake van een andere facade de juiste klassen noemt |
| Basis-set-up | `HermeticBaseArchitectureTest` | item 8: een test die middleware of exception handling uitzet |
| Testhelper | `TestHelperArchitectureTest` | item 9: of een helper in de map van zijn test hoort |
| Testdata | `TestFixtureArchitectureTest` | item 9: een scenariohelper die meer bouwt dan de test nodig heeft |
| Reflectie in een test | `ReflectionInTestsArchitectureTest` | item 18: een test die via een publieke naad toch interne staat leest |
| Typen in de testmap | `TestClassArchitectureTest` | item 9: of een double in `tests/Support` een fake had moeten zijn |
| Preset van de applicatie | `ArchitecturePresetArchitectureTest` | item 9: een functienaam als string-callable |
| Frontendlaag | ESLint `no-restricted-imports`, `layers/no-sibling-import`, `layers/final-folder` | item 17: of een hook geen domein kent |
| Component en hook | ESLint `react/function-component-definition` en de groep `settledReactRules` | item 17: of een component met veel logica een hook had moeten zijn |
| Bestandsnaam (frontend) | ESLint `names/kebab-case` | item 9: of de naam zegt wat het bestand doet |
| Browser-API | ESLint `no-restricted-globals` en `no-restricted-properties` met de lijsten `doors` en `doorFiles` in `eslint-rules/doors.js`; de ratchetrij `lint-doors` | item 9: een API zonder deur in de lijst |
| Verzoek naar de server | ESLint `no-restricted-globals` voor `fetch` buiten de twee deuren | item 9: of de getypte `fetch` alleen de offline sync en de print-API dient |
| Navigatie en melding | ESLint `navigation/no-location-write`, `downloads/no-download-link`, `toasts/no-success-toast`, `visits/no-visit-state` | item 16: de tekst van de melding |
| Frontendtest | ESLint met de groep `settledTestRules`; de ratchetrijen `frontend-test-skip` en `frontend-inertia-mocks` | item 18: of een test het gedrag vaststelt dat hij noemt |
| Gids | `DocumentedPathArchitectureTest`, `OnePatternTableArchitectureTest`, `RubricTableArchitectureTest`, `GuideSetArchitectureTest`, `GuideRulesArchitectureTest`; de ratchetrij `guide-future-tense` | item 14: of een zin alleen beweert wat de guard toont |
| Guard | `GuardShapeArchitectureTest`; `CiProjectFilesArchitectureTest` met `GuardSuiteGuard` (elke guardtest in de suite `Guards`) | item 13: een falend voorbeeld voor elke andere schrijfwijze |

## PR-checklist

De checklist staat in `.github/pull_request_template.md`. GitHub vult de beschrijving van een nieuwe PR ermee in de webinterface; een PR via de API krijgt haar niet, dus een agent kopieert de checklist zelf in de beschrijving.
