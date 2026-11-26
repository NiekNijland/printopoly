# Guard: single-use-traits

Een trait die maar één klasse gebruikt, is een verborgen deel van die klasse. `SingleUseTraitGuard` telt per trait in `app` en `tests` de klassen, enums en traits die haar gebruiken.

| Rule id | De gids zegt | In plaats daarvan |
| --- | --- | --- |
| single-use-traits | een trait is er voor code die meerdere klassen delen | zet de leden in die ene klasse, in een ouderklasse of in een samenwerkende klasse |

Review controleert, de guard niet: of een gedeelde trait beter een samenwerkende klasse is (rubric item 9).
