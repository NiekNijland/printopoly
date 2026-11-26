# Strikte modellen

Status: aanvaard.

## Context

Laravel heeft drie controles op modellen: geen lazy loading, geen attribuut dat stil wegvalt bij het vullen, en geen attribuut lezen dat niet geladen is. Tot stap 4 gooiden de eerste twee een exception buiten productie, en in productie stonden ze uit. De derde stond overal uit.

Een document in MongoDB mist soms een veld dat een nieuwer schema toevoegde. Zo'n veld moet als null lezen. De controle op een ontbrekend attribuut zou daar een exception van maken.

## Besluit

Niek koos optie a van vraag Q-06 in het plan.

- Lazy loading en een weggevallen attribuut worden in elke omgeving gecontroleerd, in `boot()` van `app/Providers/AppServiceProvider.php`. Een overtreding gooit niets: de handler meldt haar via `report()` aan Bugsnag.
- In een testrun schrijft de handler ook een sleutel (model, soort, relatie of attribuut) naar `storage/logs/model-strictness-<worker>.log`. Dat doet `app/Support/StrictModelRecorder.php`.
- De controle op een ontbrekend attribuut blijft uit, in elke omgeving.

`composer test:unit` leegt eerst die bestanden en draait de suites zonder de suite `ModelStrictness`. Als laatste vergelijkt `tests/ModelStrictness/ModelStrictnessUnionTest.php` de sleutels met de getelde lijst `tests/ModelStrictness/model-strictness-violations.txt`. Die lijst ontbreekt: de suite vond bij de meting geen overtreding. De ratchetrij `model-strictness-violations` telt haar regels. Een nieuwe overtreding los je op bij de query (`with()`, `load()`, het attribuut fillable maken of `forceFill()`), nooit met een regel op de lijst.

## Gevolgen

In productie gooit een overtreding nog steeds niets; nieuw is de melding in Bugsnag. Lokaal en in de tests gooit een overtreding niet meer; de unioncheck aan het eind van de testrun houdt haar tegen. De configtest `tests/Feature/Providers/AppServiceProviderTest.php` controleert elke schakelaar.

Stap 8 zet de controles op gooien zodra Bugsnag en de tests geen overtreding meer tonen. De recorder en de unioncheck gaan dan weg. De controle op een ontbrekend attribuut blijft uit, tenzij de oude documenten eerst het veld krijgen (optie b van Q-06, een datamigratie).
