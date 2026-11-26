# Guard: test-helpers

`TestHelperGuard` beslist waar een testhelper staat: als `public static` methode van een `final class` in `tests/Support`.

| Rule id | The guide must say | Instead |
| --- | --- | --- |
| `helper-function` | geen functie in de testmap | een statische methode van een helperklasse |
| `helper-trait` | een testtrait heeft alleen zijn set-up- en tear-downhook | verplaats de helper naar een helperklasse |
| `helper-on-base` | een gedeelde basis-testcase heeft alleen de hooks die hij overschrijft (met `#[Override]`) | verplaats de helper naar een helperklasse |

Private helpers binnen één finale testklasse mogen.
Telling: `tests/Guards/lists/test-helpers.txt`, rij `test-helpers-list` (16 helpers in `CreatesPrintFixtures` en `MakesEditions`).
