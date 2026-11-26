# Guard: test-reflection

`ReflectionInTestsGuard` beslist dat een test niet via reflectie bij private onderdelen komt.

| Rule id | The guide must say | Instead |
| --- | --- | --- |
| `reflection` | een test leest alleen de publieke structuur van een klasse | test via het publieke gedrag, of geef de klasse een publieke naad |

Gevonden: reflectie op methoden, properties, constanten en objecten, een klasse gelezen buiten haar publieke structuur, een member toegankelijk gemaakt, en een closure gebonden aan een object.
Telling: `tests/Guards/lists/test-reflection.txt`, rij `test-reflection-list` (4 regels).
