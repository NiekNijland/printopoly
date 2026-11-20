# SEO-doorlichting

Stand van 20 november 2026, na de livegang. Gemeten op printopoly.nl en motormonitor.nl (productie) en in de code van motormonitor. Besluit B66 (openbare pagina's met hreflang, sitemap, OG, security.txt, SSR) is hiermee uitgewerkt.

## Het belangrijkste punt: productie draait zonder SSR

`curl https://printopoly.nl/nl` geeft `<div id="app"></div>` en `<title>Printopoly</title>`. Canonical, hreflang, OG-tags, beschrijving en alle paginatekst komen pas na JavaScript. Lighthouse haalt daardoor toch 100 voor SEO (die meet de DOM na JS), maar crawlers zonder JS, linkpreviews (WhatsApp, Slack, Facebook, LinkedIn) en AI-crawlers zien een lege pagina.

Oorzaak: `release_profile.ssr: false` voor printopoly in motormonitor-ansible, omdat `scripts/build-site-artifact.sh` het SSR-contract niet levert.

### Het SSR-contract van motormonitor-ansible

De rol `application_deploy` eist bij `ssr: true`:

1. `bootstrap/ssr/ssr.js` in het artifact (`tasks/prepare.yml`).
2. `public/build/ssr-release.json` met `{"id": "<uuid v4>"}` (`tasks/prepare.yml`, `tasks/verify.yml`).
3. `ssr_release_id` in `release-manifest.json`, gelijk aan dat id (`verify.yml` vergelijkt ze).
4. Een supervisor-worker `php artisan inertia:start-ssr` in de inventory.

### Wat in deze branch is gedaan (printopoly-kant)

- `scripts/ssr-release.mjs` (Vite-plugin, zelfde als motormonitor): de clientbuild schrijft `public/build/ssr-release.json`, de SSR-build neemt dat id op in de bundel (`__SSR_RELEASE_ID__`) en `resources/js/ssr.tsx` geeft het mee als `release` in elk antwoord. Test: `resources/js/lib/ssr-release-build.test.ts`.
- `App\Support\ReleaseCheckedSsrGateway` (gebonden aan `Inertia\Ssr\Gateway`): gooit een antwoord van een oudere SSR-worker weg (tijdens een deploy), en rendert niet op de server zonder geldig `ssr-release.json`. De pagina valt dan terug op een client-root. Test: `tests/Feature/Public/SsrGatewayTest.php`.
- SSR-poort 13716 (standaard in `ssr.tsx`, `config/inertia.php`, `.env.example`, `scripts/check-ssr-self-contained.mjs`). 13714 en 13715 zijn van MotorMonitor productie en acceptatie op dezelfde host. De poort staat in de bundel ingebakken (geen `.env` bij de build), dus de standaard moet al goed zijn, anders botst de worker met MotorMonitor.
- Lokaal gecontroleerd: `npm run build:ssr` geeft `bootstrap/ssr/ssr.js` en `public/build/ssr-release.json`; met `inertia:start-ssr` bevat de HTML h1, title, canonical, hreflang, OG, robots en JSON-LD.

### Nodig in motormonitor-ansible (niet gewijzigd, zie opdracht)

1. `scripts/build-site-artifact.sh`, in het `docker run`-blok:
   - `npm run build` vervangen door `npm run build:ssr` (printopoly heeft dat script: `vite build && vite build --ssr`).
   - Na de build: `find public/build bootstrap/ssr -name "*.map" -type f -delete`.
   - De controle `for path in vendor/autoload.php public/build/manifest.json artisan` uitbreiden met `public/build/ssr-release.json bootstrap/ssr/ssr.js` (alleen als `bootstrap/ssr/ssr.js` bestaat, want vraagwagen heeft geen SSR; of een argument/omgevingsvariabele `WITH_SSR=1`).
   - In het manifest-script `"ssr_release_id" => json_decode(file_get_contents("public/build/ssr-release.json"), true)["id"]` toevoegen (zelfde conditie).
   - Het tar-commando sluit `bootstrap/ssr` niet uit; dat blijft zo.
2. `inventories/production/group_vars/motormonitor.yml`, site printopoly:
   - `release_profile.ssr: false` weghalen (de standaard is `true`) en het commentaar erboven aanpassen.
   - Bij `workers` toevoegen, naast horizon en reverb:
     ```yaml
     - name: ssr
       command: php artisan inertia:start-ssr
       numprocs: 1
       stopwaitsecs: 60
       drain_before_release_switch: false
     ```
   - In de productie-`.env` van printopoly (vault): `INERTIA_SSR_ENABLED=true`, `INERTIA_SSR_URL=http://127.0.0.1:13716` (is ook de standaard).
3. Controleren na de deploy: `curl -s https://printopoly.nl/nl | grep -c '<h1'` moet 1 geven, en `supervisorctl status printopoly-ssr:*` moet RUNNING tonen.

## Vergelijking printopoly en motormonitor

| Onderdeel | Printopoly voor | Printopoly nu (in code) | MotorMonitor |
| --- | --- | --- | --- |
| HTML met paginatekst zonder JS | nee (lege `#app`) | ja, zodra SSR aan staat (ansible, zie boven) | ja (SSR aan) |
| `<html lang>` | ja | ja | ja |
| Titel per pagina | alleen via JS; kort ("Vragen · Printopoly") | uniek, 30 tot 70 tekens, via SSR; printgids en vragen kregen een `seo_title` | ja |
| Meta description | alleen via JS; privacy, voorwaarden en contact te kort | 90 tot 160 tekens, test bewaakt lengte | ja |
| Canonical | alleen via JS | via SSR, trailing slash geeft 301 | ja, trailing slash 301 |
| hreflang nl, en, x-default | alleen via JS | via SSR (en in de sitemap) | ja |
| OG en Twitter | alleen via JS, zonder afmetingen en alt | plus `og:image:width/height/alt`, `twitter:image:alt` | ja, met afmetingen |
| OG-afbeelding | 1200 x 630 PNG per taal (53 kB), ziet er goed uit | ongewijzigd | per pagina gegenereerd |
| JSON-LD | geen | Organization, WebSite, WebPage of ContactPage, BreadcrumbList, WebApplication en FAQPage (home), FAQPage (vragen), Article (printgids) | Organization, WebSite, ItemList e.d. |
| Robots-meta | geen | `index, follow, max-image-preview:large` op openbare pagina's, `noindex, nofollow` op alles zonder SEO-data | geen |
| X-Robots-Tag noindex | nee | editor, edities, print, API, 404 | alleen enkele pagina's |
| robots.txt | leeg op productie (alleen Cloudflare-blok, geen regels en geen Sitemap-regel) | statisch bestand `public/robots.txt` met Content-Signal, disallows en Sitemap | statisch bestand |
| sitemap | goed (hreflang), geen lastmod | plus `lastmod` uit `config/seo.php` en `Cache-Control` | sitemap-index met lastmod |
| Beveiligingsheaders | geen | HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy (geen CSP) | alle, met CSP en COOP |
| 404-pagina | kale Laravel-pagina, geen taal | eigen pagina in de taal van het pad, status 404, noindex; ook 403, 419, 500, 503 | eigen pagina |
| Trailing slash | `/nl/` geeft 200 (dubbele URL) | 301 naar zonder slash | 301 |
| Manifest en favicons | favicon.ico (32), svg, apple-touch | plus `site.webmanifest`, `favicon-48x48.png`, `icon-192.png`, `icon-512.png` | ja |
| theme-color | ja (#F6F1E4) | ja | ja (script voor donker) |
| http naar https, www naar apex | 301, 301 (Cloudflare) | n.v.t. | 301 |
| Assets | `immutable`, 1 jaar, Brotli, Cloudflare HIT | ongewijzigd | idem |
| security.txt | ja | ja | ja |
| HTML-cache | `no-cache, private` | ongewijzigd, bewust (zie onder) | `private, max-age=300` plus Last-Modified |

### Lighthouse (productie, headless Chrome, Lighthouse 12.8.2, voor de wijzigingen)

| Pagina | Prestaties | Toegankelijkheid | Best practices | SEO |
| --- | --- | --- | --- | --- |
| printopoly.nl/nl mobiel | 91 (LCP 2,8 s) | 100 | 96 | 100 |
| printopoly.nl/nl desktop | 100 (LCP 0,6 s) | 100 | 96 | 100 |
| printopoly.nl/nl/vragen mobiel | 95 tot 97 | 100 | 96 | 100 |
| motormonitor.nl/nl mobiel | 72 tot 81 (LCP 3,5 s) | 96 | 96 | 92 |
| motormonitor.nl/nl desktop | 97 tot 98 | 100 | 96 | 92 |

De 96 bij best practices komt bij beide sites door een consolefout van Bugsnag (sessie-eindpunt geblokkeerd in de container), geen siteprobleem. MotorMonitor verliest SEO-punten op een robots.txt-fout (Content-Signal, door Lighthouse niet herkend). Die regel staat ook in `public/robots.txt` van printopoly; Lighthouse 12.8 kan daar dus ook een fout op geven. Niet opnieuw gemeten na de wijzigingen: de prestatiewinst van SSR (eerste inhoud zonder JS) is nog te verifiëren na de ansible-wijziging.

## Wat is gerepareerd

- SSR-contract (zie boven).
- Meta: unieke titels en beschrijvingen van de juiste lengte (alleen titels en beschrijvingen aangepast, geen paginateksten), robots-meta, OG-afmetingen.
- JSON-LD per pagina (`App\Support\StructuredData`, in de `seo`-prop, getest).
- noindex voor alles wat niet openbaar is (header en meta), 404-pagina, trailing-slash-redirect, beveiligingsheaders.
- `robots.txt` als statisch bestand. Op productie bleef alleen het Cloudflare-blok over, zonder regels en zonder sitemap-verwijzing; waarom precies is vanaf buiten niet vast te stellen. Een statisch bestand werkt bij motormonitor, dus dat is overgenomen. Het oude `ShowRobotsController` is weg.
- Sitemap met `lastmod`. De datum per pagina staat in `config/seo.php` en gaat pas omhoog als de tekst verandert (een deploy mag hem niet laten verspringen).
- Manifest en favicon-set.

## Bewust anders dan motormonitor

- Geen CSP: de printpagina en Chrome's PDF-render laden scripts en fonts van meerdere origins; een CSP vraagt een eigen ronde. Geen COOP om dezelfde reden.
- HTML blijft `no-cache, private`. Een korte browsercache zou na inloggen via Google een verouderde, uitgelogde pagina kunnen tonen.
- Geen per-pagina OG-afbeelding (B77 volgt: bordscreenshot voor de groepsapp).

## Niet gedaan, volgt later

- Fonts preloaden (nu laden ze via de CSS); eerst meten nadat SSR aan staat.
- Lighthouse opnieuw draaien op productie na de SSR-wijziging, mobiel en desktop.
- `hrefLang` komt uit React als `hrefLang` (HTML is hoofdletterongevoelig; motormonitor heeft hetzelfde).
- Productie-`.env` laat de browser een Reverb-host `127.0.0.1` krijgen (`printopoly-config` in de HTML). Geen SEO-punt, maar waarschijnlijk niet bedoeld.
- Search Console en Bing Webmaster Tools koppelen en de sitemap indienen (Niek).
