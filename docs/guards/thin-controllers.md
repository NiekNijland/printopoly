# Guard: thin-controllers

Een controller schrijft niet zelf naar de database: geen `save()`, `delete()`, `update()` of andere schrijfmethode, geen lock, geen transactie en geen aanroep van de facade `DB`. Hij roept een action of een service van een module aan. `ThinControllerGuard` leest de controllers in `app/Http/Controllers`.

| Rule id | De gids zegt | In plaats daarvan |
| --- | --- | --- |
| thin-controllers | een controller schrijft, lockt en opent geen transactie | verplaats de schrijfactie naar een action van de module en roep die aan via de constructor |

Een schrijfmethode op een property die de constructor als action of service binnenkrijgt, telt niet: dat is de aanroep van de action. De lengte van een actie is de regel van `docs/guards/method-size.md`.

Review controleert, de guard niet: een schrijfactie via een helperklasse die geen action of service is (rubric item 9).
