# Printopoly

Printopoly is een gratis website in het Nederlands en Engels waarop je in de browser een eigen editie van het bekende handelsspel ontwerpt. Je downloadt print-klare PDF's met instructies: het bord als sticker voor een gekocht bord, en kaarten, eigendomsbewijzen, speelgeld en extra's om te laten drukken of thuis te printen. De site komt op [printopoly.nl](https://printopoly.nl).

Printopoly is niet verbonden aan Hasbro en gebruikt de merknaam en het logo niet in de eigen naam of branding (B35).

- [Plan](docs/plan.md)
- [Beslissingen](docs/beslissingen.md)
- Vragenrondes: [1](docs/archive/vragen.md), [2](docs/archive/vragen-ronde-2.md), [3](docs/archive/vragen-ronde-3.md), [4](docs/archive/vragen-ronde-4.md)

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

## Mail en inactieve accounts

Uitgaande mail loopt via Apple iCloud (eigen domein printopoly.nl, B120). Zet in `.env`:

| Sleutel | Wat |
| --- | --- |
| `MAIL_MAILER` | `smtp` |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_SCHEME` | `smtp.mail.me.com`, `587`, `smtp` (STARTTLS) |
| `MAIL_USERNAME` | het Apple ID |
| `MAIL_PASSWORD` | een app-specifiek wachtwoord (appleid.apple.com) |
| `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` | `hallo@printopoly.nl` (een adres of alias van dat Apple ID), `Printopoly` |

De privacyverklaring belooft dat een account dat 24 maanden niet is gebruikt wordt verwijderd, na een e-mail 30 dagen eerder. `printopoly:inactive-accounts` draait dagelijks om 04:00 (scheduler): na 23 maanden zonder gebruik gaat er één waarschuwing uit in de taal van het account, na 24 maanden en minstens 30 dagen na die mail gaat het account door `DeleteAccount` (dus ook uploads, printbestanden en edities). Inloggen of ander gebruik van een ingelogd account wist de waarschuwing en begint de termijn opnieuw. Zonder werkende mailinstelling (`log`, `array` of een lege SMTP-login) verstuurt het commando niets en verwijdert het ook niets.

## Samen maken

De maker van een editie zet een link in de groepsapp; vrienden sturen foto's en voorstellen zonder account (B128). Zetten in `.env` (alle met een standaard):

| Sleutel | Wat |
| --- | --- |
| `PRINTOPOLY_BOX_RETENTION_DAYS` | dagen zonder activiteit voordat een bak en zijn foto's verdwijnen (30) |
| `PRINTOPOLY_BOX_MAX_CONTRIBUTIONS`, `PRINTOPOLY_BOX_MAX_PHOTOS` | bijdragen en foto's per bak (150 en 60) |
| `PRINTOPOLY_BOX_MAX_PHOTO_MB` | grootte van een foto van een vriend (15) |
| `PRINTOPOLY_BOX_MAX_PER_IP_PER_DAY` | links per adres per dag zonder account (10) |

De foto's staan op de schijf uit `PRINTOPOLY_DISK`. `printopoly:cleanup-boxes` draait dagelijks om 03:45 (scheduler). Het plaatje voor de groepsapp maakt Chrome tijdens het webverzoek zelf op (de printpagina haalt scripts van dezelfde server), dus lokaal heeft `php artisan serve` meer dan één worker nodig (`PHP_CLI_SERVER_WORKERS=4`); in productie doet php-fpm dat al. Na de deploy draait `artisan migrate` voor de indexen.

## Controles

Elke controle draait in Sail (`./vendor/bin/sail …`):

| Commando | Wat |
| --- | --- |
| `composer test` | Alle controles van CI achter elkaar (`bash scripts/checks.sh`): poort, statisch, guards, repo |
| `composer test:lint` | Rector (dry-run), Pint, parallel-lint en Prettier, zonder iets te wijzigen |
| `composer test:types` | PHPStan level 10 op de app (`phpstan.neon`) en op de tests met dead-code-detectie (`phpstan-tests.neon`) |
| `composer test:type-coverage` | Typedekking van de app, minimaal 100 |
| `composer test:unit` | PHPUnit met coverage, de vloer staat in `scripts/coverage-floor.txt`; als laatste de unioncheck van de strikte modellen (`docs/decisions/0002-strict-models.md`) |
| `composer lint` | Rector en Pint en Prettier herschrijven (nooit in CI) |
| `composer update:requirements` | `composer update` en `composer bump` |
| `composer security` | `composer audit` |
| `npm run lint` | ESLint met `--max-warnings=0` (`npm run lint:fix` herstelt) |
| `npm run types` | `tsc6 --noEmit` |
| `npm run test` | Vitest (`npm run test:coverage` houdt de vloer in `vitest.config.ts`) |
| `npm run knip` | Ongebruikte bestanden, exports en dependencies |
| `npm run build:ssr` en `npm run ssr:check` | Build met SSR-bundel, en de controle dat die zonder `node_modules` opstart |
| `bash scripts/prepush.sh` | Alle onderdelen van `composer test` naast elkaar, voor elke push |
| `bash scripts/debt-dashboard.sh --details` | Alle schuldtellers met hun doel |

De GitHub Action `.github/workflows/kit-checks.yml` draait die controles: `checks` (vier onderdelen), `backend-tests`, `frontend-tests`, `smoke` (de stack met productie-drivers, echte Chrome en de PDF-render) en elke nacht het dashboard, zondag ook de mutatietest.

Het release-artifact bouwt `scripts/build-site-artifact.sh` in motormonitor-ansible (B51): `composer install --no-dev`, `npm ci` en `npm run build`, met `public/build/manifest.json` en de entry `resources/js/app.tsx`.
