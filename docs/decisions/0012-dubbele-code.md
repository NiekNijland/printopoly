# Dubbele code daalt alleen

Status: voorgesteld in stap 9 (punt 11 van de after-zero backlog in `docs/archive/zero-debt-plan.md`); de eigenaar keurt goed bij de merge.

## Context

De auditor vond 42 groepen van acht of meer gelijke regels in meer dan één bestand, bijna allemaal in `resources/js/components/render`. Daarnaast stond de CSP van de printpagina twee keer met de hand uitgeschreven, en de lengte 40 van een geheime link vijf keer.

## Besluit

- `CodeCloneGuard` telt groepen van acht of meer genormaliseerde regels die in twee of meer bestanden van `app` en `resources/js` staan (tests niet). De regels staan in `docs/guards/code-clones.md`.
- De groepen van vandaag staan op de lijst code-clones.txt in de map lists van `tests/Guards`. De rij `code-clones` telt die lijst. Het is een `max`-rij in `SHRINK_ONLY` van `scripts/debt-dashboard.sh`: ze mag dalen en nooit stijgen.
