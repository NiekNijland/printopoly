# Printopoly

Printopoly is een gratis website in het Nederlands en Engels waarop je in de browser een eigen editie van het bekende handelsspel ontwerpt. Je downloadt print-klare PDF's met instructies: het bord als sticker voor een gekocht bord, en kaarten, eigendomsbewijzen, speelgeld en extra's om te laten drukken of thuis te printen. De site komt op [printopoly.nl](https://printopoly.nl).

Printopoly is niet verbonden aan Hasbro en gebruikt de merknaam en het logo niet in de eigen naam of branding (B35).

- [Plan](docs/plan.md)
- [Beslissingen](docs/beslissingen.md)
- Vragenrondes: [1](docs/vragen.md), [2](docs/vragen-ronde-2.md), [3](docs/vragen-ronde-3.md)

## Lokaal draaien

Alles draait in Laravel Sail: PHP 8.5 met ext-mongodb, MongoDB en Redis. Node draait ook in de container, dus `node_modules` is voor Linux.

```bash
cp .env.example .env                      # zet WWWUSER/WWWGROUP op `id -u` / `id -g`
composer install                          # eenmalig op de host, daarna via Sail
./vendor/bin/sail up -d
./vendor/bin/sail artisan key:generate
./vendor/bin/sail npm ci
./vendor/bin/sail composer dev            # server, Horizon, logs en Vite
```

De site staat dan op http://localhost:8090 (`APP_PORT`). De poorten in `.env.example` wijken af van Sails standaard, zodat Printopoly naast motormonitor kan draaien. Inloggen met Google is optioneel: zonder `GOOGLE_CLIENT_ID` en `GOOGLE_CLIENT_SECRET` werkt de site gewoon en is de knop weg.

## Controles

Elke controle draait in Sail (`./vendor/bin/sail …`):

| Commando | Wat |
| --- | --- |
| `composer codestyle` | Rector en Pint herschrijven, parallel-lint, PHPStan, en daarna Wayfinder en de TypeScript-types opnieuw genereren |
| `composer codestyle:check` | Hetzelfde zonder iets te wijzigen, zoals CI |
| `composer analyse` | PHPStan level 10 op de app (`phpstan.neon`) en op de tests met dead-code-detectie (`phpstan-tests.neon`) |
| `composer test` | PHPUnit met paratest, elke worker een eigen MongoDB-database |
| `composer security` | `composer audit` |
| `npm run format:check` | Prettier (`npm run format` herschrijft) |
| `npm run lint` | ESLint met `--max-warnings=0` (`npm run lint:fix` herstelt) |
| `npm run types` | `tsc --noEmit` |
| `npm run test` | Vitest |
| `npm run knip` | Ongebruikte bestanden, exports en dependencies |
| `npm run build:ssr` en `npm run ssr:check` | Build met SSR-bundel, en de controle dat die zonder `node_modules` opstart |
| `composer check` | Alles hierboven achter elkaar, stopt bij de eerste fout |

De GitHub Actions in `.github/workflows` draaien dezelfde controles: `codestyle`, `tests` (met MongoDB en Redis) en `frontend` (lint, types, tests, build).

Het release-artifact bouwt `scripts/build-site-artifact.sh` in motormonitor-ansible (B51): `composer install --no-dev`, `npm ci` en `npm run build`, met `public/build/manifest.json` en de entry `resources/js/app.tsx`.
