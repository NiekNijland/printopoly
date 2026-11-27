# Majors die achterblijven

Status: aanvaard.

## Context

Het plan (D-16) zegt: elke major wordt bijgewerkt, behalve `@types/node`, dat op 24 blijft. In stap 9 stonden drie npm-pakketten een major achter; Composer had er geen.

- `@types/node` 24, de laatste is 26. De runtime is Node 24 (`.nvmrc`, `NODE_VERSION` in `docker/8.5/Dockerfile`). Typen van een nieuwere Node beloven API's die de server niet heeft.
- `eslint` en `@eslint/js` 9, de laatste is 10. `eslint-plugin-react` (7.37.5), `eslint-plugin-import` (2.32.0) en `eslint-plugin-jsx-a11y` (6.10.2) zijn de laatste releases en accepteren als peer alleen ESLint tot en met 9. npm weigert de update (`ERESOLVE`), en een installatie met `--force` of `--legacy-peer-deps` laat regels draaien die niet voor ESLint 10 gemaakt zijn.

## Besluit

- `@types/node` blijft op 24 zolang de runtime Node 24 is. Gaat de runtime naar een nieuwere major, dan gaan de typen mee.
- `eslint` en `@eslint/js` blijven op 9 tot de drie plugins ESLint 10 als peer accepteren. Dan komt de update in een eigen pull request.
- `cap-dependencies-majors-behind` staat in `SHRINK_ONLY` van `scripts/debt-dashboard.sh`. De cap daalt naar 3, het aantal van vandaag.

## Gevolgen

De rij `dependencies-majors-behind` mag alleen dalen. Een nieuwe major van een ander pakket wordt bijgewerkt en valt niet onder dit besluit; een nieuwe uitzondering vraagt een nieuw record.
