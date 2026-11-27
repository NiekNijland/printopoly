# Dubbele code daalt alleen

Status: voorgesteld in stap 9 (punt 11 van de after-zero backlog in `docs/archive/zero-debt-plan.md`); de eigenaar keurt goed bij de merge.

## Context

De auditor vond 42 groepen van acht of meer gelijke regels in meer dan één bestand, bijna allemaal in `resources/js/components/render`. Daarnaast stond de CSP van de printpagina twee keer met de hand uitgeschreven, en de lengte 40 van een geheime link vijf keer.

## Besluit

- `CodeCloneGuard` telt groepen van acht of meer genormaliseerde regels die in twee of meer bestanden van `app` en `resources/js` staan. Tests, testhelpers en de gegenereerde routes en actions tellen niet mee. De regels staan in `docs/guards/code-clones.md`.
- De groepen van vandaag staan op de lijst code-clones.txt in de map lists van `tests/Guards`. De rij `code-clones` telt die lijst. Het is een `max`-rij in `SHRINK_ONLY` van `scripts/debt-dashboard.sh`: ze mag dalen en nooit stijgen.
- De eerste meting gaf 38 groepen. Na deze ronde staan er 16.
- De CSP van de printpagina en van het deelplaatje komt uit `PrintHtmlBuilder::contentSecurityPolicy()`. De lengte van een geheime link staat in `App\Support\CapabilityToken::LENGTH`; `CapabilityToken::make()` maakt het token en `CapabilityToken::pattern()` is de regex die de ready-request controleert.

## Wat weg is

Gedeelde stukken vervangen de kopieën. De render-output bleef byte voor byte gelijk: een golden render van 320 combinaties (elk printonderdeel in elk thema en elke stijl, elke titelstijl met en zonder foto, en het deelplaatje) gaf voor en na dezelfde markup.

- `BoxSvg` en `Svg` in `resources/js/components/render/sheet.tsx` vervangen de losse gepositioneerde `<svg>`-blokken en de kopieën van `Svg` en `Art`.
- `ScaledBoard` in `board.tsx` dient het dekselbord en de uitnodiging; `TiltedPlate` dient de titelstijlen bordje en stempel; `CardFrame` dient de kaartachterkant en de huisregels; `StreetBand` dient de twee soorten straatvakken.
- `layerBox()`, `usePhotoPick()`, `useMeasuredWidth()`, `chooseFrom()`, `useTemplatePreview()` en `fillWords()` via `wordOf()` halen dubbele logica in de editor en de lib weg.
- `ElementKind` en `PrintPart` zijn aliassen van de gegenereerde typen; de twee fotorequests van een anonieme printjob lezen hun uploads met `StoreAnonymousPrintPhotosRequest::photosOf()`.

## Wat blijft, en waarom

16 groepen blijven op de lijst. Geen ervan is logica die op twee plekken kan uiteenlopen.

- Tekst van het spelregelboekje in twee talen (3 groepen in `rules-booklet-en.ts`, `rules-booklet-nl.ts` en `rules-booklet-facts.ts`). Elke taal heeft zijn eigen zinnen met dezelfde opbouw; samenvoegen maakt de vertaling moeilijker te lezen.
- Dezelfde lijst props in de stijlvarianten van één onderdeel (8 groepen: kaartvoorkant, kaartachterkant en kaartplaat per stijl, de vakken per stijl en met foto, de kop van het eigendomsbewijs, het bankbiljet, de secties Tekst en Bedragen). Elke variant tekent anders; alleen de destructuring van dezelfde props valt samen.
- Markup van stijlvarianten die op elkaar lijkt (5 groepen: foto over de hele kaart, de guilloche van het bankbiljet, de titels gewoon en schrift, de ornamenten van Vintage). Het zijn tekeningen met eigen maten per stijl. Een gedeeld component zou per stijl weer opties nodig hebben, en de look mag niet veranderen.

## Gevolgen

Een nieuwe kopie van acht of meer regels laat de guard falen. Wie code wil hergebruiken, zet haar in één functie of component die elk bestand importeert. Een groep die verdwijnt, gaat van de lijst in dezelfde commit, met `[ratchet: code-clones] <reden>` in de commit.
