# Guard: AssertionSpellingGuard

Beslist hoe een test iets vaststelt: de eigen asserties van PHPUnit via `self::`, exact vergeleken, en nooit een assertie die niet kan falen.

| Rule id | The guide must say | Instead |
| --- | --- | --- |
| `this-assert` | een assertie van PHPUnit staat achter `self::` | `self::assertSame(...)`; een assertie die het framework aan de testcase toevoegt (`assertDatabaseHas`) blijft op `$this` |
| `static-assert` | niet achter `static::` | `self::` |
| `assert-equals` | geen losse vergelijking | `assertSame` of de exacte assertie (`assertTrue`, `assertCount`, `assertNull`) |
| `no-op-assert` | geen assertie die altijd slaagt en geen marker voor een test zonder asserties | roep de code aan en stel het resultaat of de achtergelaten staat vast |

De guard leest de lijst met asserties van PHPUnit uit de klasse `PHPUnit\Framework\Assert`, dus een nieuwe assertie van PHPUnit valt er vanzelf onder.
Telling: `tests/Guards/lists/assertion-spelling.txt`, rij `assertion-spelling-list` (122 `this-assert`, 5 `assert-equals`).
Review checks, and the guard does not: of een assertie kan falen (rubric item 11).
