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

De Sail-image heeft ook `poppler-utils` (`pdfinfo`, voor de PDF-controle) en een headless Chrome op `/usr/local/bin/chrome-headless-shell` (dezelfde naam als op de server). PDF's maken draait op de wachtrij `pdf`, dus `composer dev` (Horizon) moet aan staan, en de printpagina gebruikt de gebouwde assets: draai eerst `npm run build`. Bouw de image opnieuw (`sail build`) als je hem van vóór deze wijziging hebt.

Twee sleutels bepalen hoe Chrome de app bereikt tijdens het renderen: `PRINTOPOLY_RENDER_BASE_URL` (waar alles vandaan komt dat Chrome laadt: scripts, fonts en de ondertekende fotolinks; nooit `APP_URL`) en `PRINTOPOLY_CHROME_HOST_RESOLVER_RULES` (wordt `--host-resolver-rules` voor Chrome; leeg lokaal). Productie gebruikt `http://printopoly.nl:8080` met `MAP printopoly.nl 127.0.0.1`, de loopback-verificatieserver van nginx.

De site staat dan op http://localhost:8090 (`APP_PORT`). De poorten in `.env.example` wijken af van Sails standaard, zodat Printopoly naast motormonitor kan draaien. Inloggen met Google is optioneel: zonder `GOOGLE_CLIENT_ID` en `GOOGLE_CLIENT_SECRET` werkt de site gewoon en is de knop weg.

## Opslag (R2)

Uploads, uitsneden, PDF's en ZIP's staan op de schijf uit `PRINTOPOLY_DISK`: `local` in ontwikkeling, `r2` in productie (B68). `r2` is een privé S3-schijf op Cloudflare R2 in de EU-jurisdictie, met path-style adressering en zonder publieke URL. Zet in `.env`:

| Sleutel | Wat |
| --- | --- |
| `PRINTOPOLY_DISK` | `r2` |
| `R2_ENDPOINT` | `https://<account>.eu.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | sleutel met rechten op alleen deze bucket |
| `R2_BUCKET` | bijvoorbeeld `printopoly-prod` |
| `R2_REGION` | `auto` (standaard) |

Downloads lopen als stream door de geautoriseerde routes, fotovoorbeelden via een tijdelijke link van 5 minuten, en Chrome haalt uitsneden op via de ondertekende route `print-render/...` (B105). De opruiming na 7 dagen wist ook op R2.

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
