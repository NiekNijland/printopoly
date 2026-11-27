# Guard: class-shape

De vorm van een klasse volgt uit de map waarin ze staat. Vier guards lezen de mapnaam, niet de namespace: `FinalReadonlyGuard`, `ActionNamingGuard`, `EnumShapeGuard` en `DataNamingGuard`.

| Rule id | De gids zegt | In plaats daarvan |
| --- | --- | --- |
| final-readonly | een controller en een action zijn `final readonly` | declareer de klasse als `final readonly class`, met haar afhankelijkheden in de constructor |
| action-name | een action heet naar een werkwoord en een zelfstandig naamwoord, zonder `Action`-achtervoegsel | hernoem de action naar wat ze doet (`DeleteEdition`) |
| action-entry | een action heeft naast de constructor één publieke methode: `handle()` | hernoem de ingang naar `handle` en maak de andere methodes privé |
| enum-backing | een enum heeft een string als waarde | declareer `enum X: string` en geef elke case een leesbare waarde |
| enum-cases | een enum-case staat in `UPPER_CASE` | hernoem de cases; de waarden blijven gelijk |
| enum-folder | een map `Enums` bevat alleen enums | verplaats de klasse naar de map van haar soort |
| data-name | een DTO heet `<X>Data`: een klasse in een map `Data`, en elke klasse die van `Spatie\LaravelData\Data` erft | hernoem de klasse |

Er is geen lijst met uitzonderingen: elke controller, action en enum voldoet aan deze regels.

`final` voor elke concrete klasse is de regel `final_class` van de formatter, met de dashboard-rij `open-classes` als teller. `ClosedClassGuard` (`docs/guards/closed-classes.md`) controleert wat die regel niet ziet.

Review controleert, de guard niet: of de naam van een action echt met een werkwoord begint (rubric item 9).
