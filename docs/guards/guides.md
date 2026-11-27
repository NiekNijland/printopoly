# Guard: guides

De gidsen zijn de root-`AGENTS.md`, `app/AGENTS.md`, `tests/AGENTS.md`, `resources/js/AGENTS.md` en `docs/review-rubric.md`. Vijf detectors lezen ze; elk heeft een dunne test in `tests/Guards`.

| Rule id | The guide must say | Instead |
| --- | --- | --- |
| `documented-path` | een pad in backticks bestaat | noem het bestand zoals het nu heet, of schrijf een voorbeeld met een placeholder als `<Name>` |
| `guard-list` | elke guard houdt de woorden die hij leest in zijn eigen bestand in `docs/guards` | zet de guard op de lijst van de root-`AGENTS.md` met zijn bestand `docs/guards/<naam>.md` |
| `one-pattern-guard` | elke regel van de gidsen noemt zijn guard bij een naam van deze lijst | noem de guard in de kolom Guard, of bouw hem eerst |
| `one-pattern-example` | nieuwe code kopieert het voorbeeldbestand, niet het bestand ernaast | kies een voorbeeld dat elke regel haalt |
| `lands-with` | een rij zonder voorbeeld noemt de PR van stap 8 die het voorbeeld brengt | zet "lands with" alleen in de kolom Kopieer van de tabel One pattern |
| `rubric-table` | elke rij van de tabel One pattern in `AGENTS.md`, in dezelfde volgorde | zet de rij in de rubric met haar guard of haar genummerde reviewitem |
| `guide-tense` | een zin die een overgang beschrijft | schrijf de eindtoestand in de tegenwoordige tijd |
| `guide-rules` | faalt op een gids die de woorden van een rij kwijt is | zet de zin terug, of pas de rij en de guard samen aan |

`DocumentedPathGuard` leest de gidsen, de README en de bestanden direct in `docs`, behalve `docs/beslissingen.md`: die lijst groeit alleen. Van de mappen onder `docs` leest hij alleen `docs/decisions/0001-one-pattern.md`; de rest is geschiedenis, feedback en ontwerp. Hij leest elk pad in backticks, in een `<code>`-element en in een linkdoel, ook met een `:regel`-achtervoegsel. Een pad onder een bekende map bestaat; een relatief pad met een extensie is het einde van een bestand in de boom. Blinde vlek: een relatief pad zonder extensie (`hooks/use-x`).

`OnePatternTableGuard` leest de tabel One pattern en de lijst Guards van de root-`AGENTS.md`. Een rij noemt een guard van de lijst; haar voorbeeld bestaat en staat in geen lijst, baseline of suppressie (de mappen lists en baselines in de root, de map lists in `tests/Guards` en in `tests/Support/Architecture`, en `eslint-suppressions.json`); "lands with" staat alleen in de kolom Kopieer.

`RubricTableGuard` vergelijkt de eerste kolom van de tabel One pattern met de tabel van de rubric, in dezelfde volgorde, en eist per rij een guard of een genummerd item dat de rubric heeft.

`GuideSetGuard` eist dat de lijst Guards en de bestanden in `docs/guards` elkaar dekken, en dat de ratchetrij `guide-future-tense` elke `AGENTS.md` en de rubric telt. Die rij telt "will", "for now", "until" en de Nederlandse overgangswoorden; een `max`-rij, doel 0.

`GuideRulesGuard` leest per bestand in `docs/guards` de tabel Rule id en eist dat de gidsen de woorden houden. De test pint per bestand de ids.

Telling: rij `one-pattern-list`, de lijst one-pattern.txt in de map lists van `tests/Guards`: de rijen zonder guard en de voorbeelden die op een lijst staan. Hij staat op 0 en het bestand is weg.
Review controleert, de guard niet: of een zin alleen beweert wat de falende voorbeelden van de guard tonen (rubric item 14).
