# Voortgang en overdracht

Stand van 20 november 2026. Dit bestand is de overdracht tussen sessies: lees het na `plan.md` en `beslissingen.md`.

## Doel nu

Printopoly zo snel mogelijk live op printopoly.nl, gebouwd door parallelle subagents (bouwen op Sonnet, het fundament op het sterkste model), met alle kwaliteitschecks van motormonitor en aiassist.

## Wat klaar is

- Plan, besluiten B1 t/m B100 en vragenrondes 1 t/m 4 in `docs/`. Open vragen met voorstel (voorstel geldt bij geen antwoord): `vragen-ronde-3.md` (merknaam in tekst, bewaartermijn) en `vragen-ronde-4.md` (drukkerijen bij naam, exportbestand).
- Design: canvas https://claude.ai/artifact/KtUBgk1XCQSoHwgieZcCVv, bronbestanden in `docs/design/` (17 schermen). Bij twijfel is het design de specificatie.
- Spelgegevens gecontroleerd (B100).
- Cloudflare, zone printopoly.nl (actief):
  - SSL Full (strict), Always HTTPS, Authenticated Origin Pulls, Early Hints, e-mailobfuscatie uit, firewallregel tegen exploit-probes (kopie van motormonitor).
  - Redirect www naar apex (301), met een `www`-AAAA-placeholder `100::`.
  - Nog open: het apex-A-record (proxied naar <origin-ip>) bij de livegang.
- Ansible: PR https://github.com/the-deploy-repo/pull/49 (branch `feat/printopoly-site`), CI groen. Printopoly als vierde site, role `headless_chrome`, runbook `docs/runbook-new-site.md`. Niek heeft akkoord gegeven om te mergen als hij af is (vault-entries erin) en CI groen is.

## Geheimen (nooit in een repo of log)

In `~/.printopoly-origin/` (map 0700, bestanden 0600):
- `printopoly.nl.crt` en `printopoly.nl.key`: Cloudflare Origin CA, geldig tot 2041-11-16.
- `google-oauth.env`: Google OAuth client id, secret en redirect-URI `https://printopoly.nl/auth/google/callback`.

De vault-passphrase staat in `the vault passphrase file`. Te doen: in `inventories/production/group_vars/all/vault.yml` van motormonitor-ansible (branch `feat/printopoly-site`):
- `vault_tls_certificates['printopoly.nl']`
- een `vault_mongodb_users`-entry (database `printopoly`, naam `printopoly_app`, rol `readWrite`, nieuw willekeurig wachtwoord)
- `vault_site_env_files['printopoly']`: de productie-`.env`. De sleutels komen uit de `.env.example` van het fundament. Vraagwagen gebruikt `MONGODB_URI` en `MONGODB_DATABASE`.

Daarna moet de CI van PR #49 groen zijn, en dan mergen.

## Subagents en branches

Elke agent werkt in een eigen worktree onder `.claude/worktrees/`.

| Onderdeel | Branch | Status |
| --- | --- | --- |
| Fundament (Laravel 13, Inertia, React, MongoDB, Redis, Horizon, Socialite, Reverb, laravel-pdf Chrome-driver, alle checks, CI) | `feat/fundament` | bezig |
| Spelgegevens (`resources/data/standard-edition.json`, `resources/js/lib/game/`, `app/Game/StandardEdition.php`, tests) | `feat/spelgegevens` | klaar, 26 Vitest- en 17 PHPUnit-tests groen; PHPStan nog niet gedraaid; tsconfig heeft `resolveJsonModule` nodig |
| Geometrie en opmaak op vellen (`resources/js/lib/print/`: board, panels, home-stickers, imposition, calibration) | `feat/geometrie` | klaar, 49 Vitest-tests groen; geld zonder afloop (B101) |
| Basis voor parallel werk: `feat/spelgegevens` + `feat/geometrie` samengevoegd | `feat/ts-basis` | klaar, gepusht |
| Renderers in mm, drie thema's, tekstpassing (`resources/js/components/render/`, `resources/js/lib/render/`), Sonnet | `feat/renderers` (vanaf `feat/ts-basis`) | bezig |
| Editiemodel, IndexedDB-opslag, ongedaan maken, conflict tussen vensters, opslagstatus, sync-interface (`resources/js/lib/edition/`), Sonnet | `feat/edition-model` (vanaf `feat/ts-basis`) | bezig |
| Foto's (validatie, transformatie, dpi, uitsnede) en Controle (`resources/js/lib/photos/`, `resources/js/lib/checks/`, `docs/foto-uitsnede.md`), Sonnet | `feat/photos-checks` (vanaf `feat/ts-basis`) | bezig |
| Teksten NL/EN (`resources/content/`) | `feat/content` | klaar. Plaatshouders voor Niek: `[CONTACTADRES]`, `[ADRES]`, `[HOSTINGLOCATIE]`, `[DATUM]`. Nog nalezen: eigen clausules in de voorwaarden en het aantal A4-vellen voor het bord |

## Volgende stappen

De drie Sonnet-agents hierboven werken zonder fundament: ze committen geen `package.json` of configs en testen met de `node_modules` van de fundament-worktree. Welke npm-pakketten ze nodig hebben, melden ze in hun rapport.

1. Na het fundament: `feat/fundament` naar main, daarna `feat/ts-basis` (of los `feat/spelgegevens` en `feat/geometrie`), `feat/content`, `feat/renderers`, `feat/edition-model` en `feat/photos-checks` erin, gevraagde pakketten toevoegen en alle checks draaien.
2. Daarna Sonnet-agents vanaf main:
   - editor-UI (focusweergave, bordnavigator, Mijn edities, nieuwe editie, onderdelen kiezen) op de renderers en het editiemodel, plus sync na login (B81);
   - printpipeline met Horizon-job, Chrome-driver, uitsnedes, pdfinfo-controle, printpagina en Reverb (B54, B61 t/m B63, B95);
   - openbare pagina's: landing, printgids, privacy, voorwaarden, contact, sitemap, hreflang en OG (B66, B67, B97).
3. Release: een release-workflow in GitHub Actions of `scripts/build-site-artifact.sh` uit motormonitor-ansible (B51).
4. Livegang volgens het runbook. Dit zijn productie-ingrepen en vragen elk akkoord van Niek: vault, merge van PR #49, converge, eerste deploy, workers aan, apex-DNS, `public_traffic_on_host: true`.

## Werkafspraken

- Kwaliteitschecks: alles uit motormonitor en aiassist (Rector, Pint, PHPStan inclusief tests, parallel-lint, composer audit, Prettier, ESLint, tsc, Vitest, knip, PHPUnit met paratest, SSR-check).
- Teksten gaan door de humanizer-skill.
- Commits eindigen op `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Houd dit bestand bij als er iets verandert.
