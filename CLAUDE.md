# Printopoly

Hobbyproject van Niek: een gratis openbare website (NL/EN) om een eigen editie van het bekende handelsspel te ontwerpen en als print-set met PDF's en instructies te downloaden.

- Lees eerst `docs/plan.md`, `docs/beslissingen.md` en de vragenrondes in `docs/`.
- Maak je een product- of scopekeuze voor Niek, lees dan `/Users/nieknijland/Documents/Obsidian/AIStudio/AgentMemory/30-Knowledge/Niek-Decision-Preferences.md` en volg §0. Besluiten in `docs/beslissingen.md` gaan voor.
- `docs/beslissingen.md` is append-only. Elke nieuwe rij heeft een reden en een herkomst; een wijziging zegt "Vervangt Bxx".
- Stack, tooling en conventies volgen `~/git/hobby/mm/motormonitor` (B47). Hosting en deploy staan in `~/git/hobby/mm/motormonitor-ansible` (B50).
- Alles draait via Sail (`./vendor/bin/sail …`); `./vendor/bin/sail composer check` draait alle controles. Zie de README.
- De interface is tweetalig (NL/EN). Plannen zijn Nederlands; code en technische namen Engels.
- Teksten voor gebruikers en in de docs gaan door de humanizer-skill.
