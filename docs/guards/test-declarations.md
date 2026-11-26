# Guard: test-declarations

`TestDeclarationGuard` beslist hoe een test in PHPUnit wordt gedeclareerd: een publieke methode met `test_` en een zin in snake case, met `: void`.

| Rule id | The guide must say | Instead |
| --- | --- | --- |
| `test-attribute` | een test is een methode `test_<zin>`, zonder het attribuut `Test` | hernoem naar `test_refuses_an_expired_token` en haal het attribuut weg |
| `test-annotation` | geen annotatie `@test` | dezelfde naam als hierboven |
| `test-name` | de naam na `test_` is een zin in snake case, de casing van de formatter | `test_keeps_40_spaces` |
| `test-void` | elke testmethode declareert `: void` | voeg `: void` toe |
| `provider-annotation` | een dataprovider staat in het attribuut `DataProvider` met een statische provider | geen annotatie `@dataProvider` |
| `group-annotation` | geen annotatie `@group`; de guardtests zijn de suite `Guards` | laat de groep weg |

Geen getelde lijst: de echte boom heeft geen overtreding, en de test over de echte boom verwacht er nul.
De kit schrijft `testRefusesAnExpiredToken`; de formatterregel `php_unit_method_casing` van de Pint-config van de organisatie dwingt snake case af, dus geldt hier `test_` plus snake case.
Review checks, and the guard does not: of de naam zegt wat de test bewijst.
